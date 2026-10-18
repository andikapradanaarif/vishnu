// Package cloner normalizes GitHub repo references, checks the user's
// access to them through their own git credentials, and clones in the
// background so an add-project request never blocks on a fat clone.
package cloner

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"sync"
	"time"
)

var (
	ErrUnsupportedRepo = errors.New("only github repositories are supported")
	ErrRepoUnreachable = errors.New("repository unreachable — check access")
)

type Cloner struct {
	dir           string
	mu            sync.Mutex
	accessTimeout time.Duration
}

func New(dir string) *Cloner {
	return &Cloner{dir: dir, accessTimeout: 10 * time.Second}
}

func LoadDir() string {
	if v := os.Getenv("VISHNU_PROJECTS_DIR"); v != "" {
		return v
	}
	if v := os.Getenv("VISHNU_DATA_DIR"); v != "" {
		return filepath.Join(v, "projects")
	}
	return "data/projects"
}

var (
	slugPattern  = regexp.MustCompile(`^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$`)
	httpsPattern = regexp.MustCompile(`^https://github\.com/([A-Za-z0-9._-]+)/([A-Za-z0-9._-]+?)(\.git)?$`)
	sshPattern   = regexp.MustCompile(`^git@github\.com:([A-Za-z0-9._-]+)/([A-Za-z0-9._-]+?)(\.git)?$`)
)

func NormalizeRepoURL(raw string) (string, string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", "", ErrUnsupportedRepo
	}

	if m := httpsPattern.FindStringSubmatch(raw); m != nil {
		return fmt.Sprintf("https://github.com/%s/%s", m[1], m[2]), m[2], nil
	}

	// An ssh reference is kept as ssh: private repos depend on the user's
	// key, and rewriting it to https would break `git ls-remote` and clone.
	if m := sshPattern.FindStringSubmatch(raw); m != nil {
		return fmt.Sprintf("git@github.com:%s/%s.git", m[1], m[2]), m[2], nil
	}

	if slugPattern.MatchString(raw) {
		parts := strings.SplitN(raw, "/", 2)
		repo := strings.TrimSuffix(parts[1], ".git")
		if repo == "" || repo == "." {
			return "", "", ErrUnsupportedRepo
		}
		return fmt.Sprintf("https://github.com/%s/%s", parts[0], repo), repo, nil
	}

	return "", "", ErrUnsupportedRepo
}

func (c *Cloner) CheckAccess(ctx context.Context, url string) error {
	ctx, cancel := context.WithTimeout(ctx, c.accessTimeout)
	defer cancel()

	out, err := exec.CommandContext(ctx, "git", "ls-remote", url, "HEAD").CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w: %s", ErrRepoUnreachable, firstLine(out, err))
	}
	return nil
}

func (c *Cloner) Clone(ctx context.Context, url, destDir string, onDone func(error)) error {
	if err := os.MkdirAll(filepath.Dir(destDir), 0o755); err != nil {
		return fmt.Errorf("create projects directory: %w", err)
	}

	go func() {
		out, err := exec.CommandContext(ctx, "git", "clone", url, destDir).CombinedOutput()
		if err != nil {
			onDone(fmt.Errorf("clone %s: %w: %s", url, err, lastLine(out)))
			return
		}
		onDone(nil)
	}()

	return nil
}

func (c *Cloner) AllocDir(slug string) (string, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	if err := os.MkdirAll(c.dir, 0o755); err != nil {
		return "", fmt.Errorf("create projects directory: %w", err)
	}

	base := filepath.Join(c.dir, slug)
	for attempt := 1; attempt < 100; attempt++ {
		candidate := base
		if attempt > 1 {
			candidate = fmt.Sprintf("%s-%d", base, attempt)
		}
		if _, err := os.Stat(candidate); errors.Is(err, os.ErrNotExist) {
			if err := os.Mkdir(candidate, 0o755); err != nil {
				return "", fmt.Errorf("create project directory %s: %w", candidate, err)
			}
			return candidate, nil
		}
	}

	return "", fmt.Errorf("no free directory for %s", slug)
}

func firstLine(out []byte, err error) string {
	scanner := bufio.NewScanner(strings.NewReader(string(out)))
	for scanner.Scan() {
		if line := strings.TrimSpace(scanner.Text()); line != "" {
			return line
		}
	}
	return err.Error()
}

func lastLine(out []byte) string {
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	for i := len(lines) - 1; i >= 0; i-- {
		if line := strings.TrimSpace(lines[i]); line != "" {
			return line
		}
	}
	return ""
}
