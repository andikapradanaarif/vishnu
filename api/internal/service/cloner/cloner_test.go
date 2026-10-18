package cloner

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
	"time"
)

func TestNormalizeRepoURL(t *testing.T) {
	accepted := []struct {
		raw     string
		wantURL string
		wantSlu string
	}{
		{"owner/repo", "https://github.com/owner/repo", "repo"},
		{"owner/repo.git", "https://github.com/owner/repo", "repo"},
		{"https://github.com/owner/repo", "https://github.com/owner/repo", "repo"},
		{"https://github.com/owner/repo.git", "https://github.com/owner/repo", "repo"},
		{"git@github.com:owner/repo.git", "git@github.com:owner/repo.git", "repo"},
		{"git@github.com:owner/repo", "git@github.com:owner/repo.git", "repo"},
		{"  owner/repo  ", "https://github.com/owner/repo", "repo"},
		{"andikapradanaarif/vishnu", "https://github.com/andikapradanaarif/vishnu", "vishnu"},
	}

	for _, tc := range accepted {
		t.Run(tc.raw, func(t *testing.T) {
			url, slug, err := NormalizeRepoURL(tc.raw)
			if err != nil {
				t.Fatalf("expected %q to normalize, got %v", tc.raw, err)
			}
			if url != tc.wantURL || slug != tc.wantSlu {
				t.Fatalf("got (%q, %q), want (%q, %q)", url, slug, tc.wantURL, tc.wantSlu)
			}
		})
	}

	rejected := []string{
		"",
		"   ",
		"owner",
		"/repo",
		"owner/",
		"owner/repo/extra",
		"https://gitlab.com/owner/repo",
		"https://bitbucket.org/owner/repo",
		"git@gitlab.com:owner/repo.git",
		"https://github.com/owner",
		"github.com/owner/repo",
		"not a repo at all",
	}

	for _, raw := range rejected {
		t.Run("reject "+raw, func(t *testing.T) {
			if _, _, err := NormalizeRepoURL(raw); !errors.Is(err, ErrUnsupportedRepo) {
				t.Fatalf("expected %q to be rejected, got %v", raw, err)
			}
		})
	}
}

func TestAllocDirAvoidsCollisions(t *testing.T) {
	cloner := New(t.TempDir())

	first, err := cloner.AllocDir("vishnu")
	if err != nil {
		t.Fatalf("first alloc: %v", err)
	}
	second, err := cloner.AllocDir("vishnu")
	if err != nil {
		t.Fatalf("second alloc: %v", err)
	}
	third, err := cloner.AllocDir("vishnu")
	if err != nil {
		t.Fatalf("third alloc: %v", err)
	}

	if filepath.Base(first) != "vishnu" {
		t.Fatalf("got %s, want the bare slug first", first)
	}
	if filepath.Base(second) != "vishnu-2" || filepath.Base(third) != "vishnu-3" {
		t.Fatalf("collisions not suffixed: %s, %s", second, third)
	}

	for _, dir := range []string{first, second, third} {
		if info, err := os.Stat(dir); err != nil || !info.IsDir() {
			t.Fatalf("allocated dir %s is not usable: %v", dir, err)
		}
	}
}

func TestCheckAccessAcceptsALocalRepository(t *testing.T) {
	source := t.TempDir()
	git(t, source, "init", "--quiet")
	git(t, source, "-c", "user.email=test@example.com", "-c", "user.name=Test", "commit", "--allow-empty", "--quiet", "-m", "init")

	if err := New(t.TempDir()).CheckAccess(context.Background(), source); err != nil {
		t.Fatalf("expected a local repository to pass the access check, got %v", err)
	}
}

func TestCheckAccessRejectsAnUnreachableRepository(t *testing.T) {
	err := New(t.TempDir()).CheckAccess(context.Background(), "https://127.0.0.1:9/nope.git")
	if !errors.Is(err, ErrRepoUnreachable) {
		t.Fatalf("expected ErrRepoUnreachable, got %v", err)
	}
}

func TestCloneRunsInTheBackgroundAndReportsCompletion(t *testing.T) {
	source := t.TempDir()
	git(t, source, "init", "--quiet")
	if err := os.WriteFile(filepath.Join(source, "README.md"), []byte("hello\n"), 0o600); err != nil {
		t.Fatalf("write source file: %v", err)
	}
	git(t, source, "add", ".")
	git(t, source, "-c", "user.email=test@example.com", "-c", "user.name=Test", "commit", "--quiet", "-m", "init")

	cloner := New(t.TempDir())
	dest, err := cloner.AllocDir("source")
	if err != nil {
		t.Fatalf("alloc dir: %v", err)
	}

	done := make(chan error, 1)
	if err := cloner.Clone(context.Background(), source, dest, func(err error) { done <- err }); err != nil {
		t.Fatalf("clone: %v", err)
	}

	select {
	case err := <-done:
		if err != nil {
			t.Fatalf("clone reported an error: %v", err)
		}
	case <-time.After(30 * time.Second):
		t.Fatal("clone did not report completion")
	}

	if _, err := os.Stat(filepath.Join(dest, "README.md")); err != nil {
		t.Fatalf("cloned directory is missing the repository contents: %v", err)
	}
}

func TestCloneReportsFailure(t *testing.T) {
	cloner := New(t.TempDir())
	dest, err := cloner.AllocDir("missing")
	if err != nil {
		t.Fatalf("alloc dir: %v", err)
	}

	done := make(chan error, 1)
	if err := cloner.Clone(context.Background(), "https://127.0.0.1:9/nope.git", dest, func(err error) { done <- err }); err != nil {
		t.Fatalf("clone call: %v", err)
	}

	select {
	case err := <-done:
		if err == nil {
			t.Fatal("expected a clone failure to be reported")
		}
	case <-time.After(30 * time.Second):
		t.Fatal("failed clone did not report completion")
	}
}

func git(t *testing.T, dir string, args ...string) {
	t.Helper()

	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git %v: %v: %s", args, err, out)
	}
}
