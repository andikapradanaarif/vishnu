package process

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"testing"
	"time"

	"github.com/andikapradanaarif/vishnu/internal/domain"
)

func freePort(t *testing.T) int {
	t.Helper()

	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("reserve port: %v", err)
	}
	defer func() { _ = listener.Close() }()

	return listener.Addr().(*net.TCPAddr).Port
}

func TestAllocPortSkipsBusyPorts(t *testing.T) {
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("reserve port: %v", err)
	}
	defer func() { _ = listener.Close() }()
	busy := listener.Addr().(*net.TCPAddr).Port

	manager := NewManager(Options{PortStart: busy})
	got, err := manager.AllocPort()
	if err != nil {
		t.Fatalf("alloc port: %v", err)
	}
	if got <= busy {
		t.Fatalf("got port %d, want one above the busy %d", got, busy)
	}
}

func TestEnsureExternalChecksHealthWithoutSpawning(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/v1/health" {
			t.Errorf("unexpected path %s", r.URL.Path)
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	manager := NewManager(Options{CrushBin: "definitely-not-a-crush-binary"})
	upstream := server.URL
	project := domain.Project{
		ID:       "external",
		Name:     "external",
		Mode:     domain.ProjectModeExternal,
		Upstream: &upstream,
		Status:   domain.ProjectStatusReady,
	}

	got, err := manager.Ensure(context.Background(), project)
	if err != nil {
		t.Fatalf("ensure external: %v", err)
	}
	if got != upstream {
		t.Fatalf("got %q, want %q", got, upstream)
	}
	if status := manager.LiveStatus(project.ID); status != StatusUp {
		t.Fatalf("got status %q, want %q", status, StatusUp)
	}
}

func TestEnsureExternalFailsWhenUnreachable(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	upstream := server.URL
	server.Close()

	manager := NewManager(Options{})
	project := domain.Project{
		ID:       "gone",
		Name:     "gone",
		Mode:     domain.ProjectModeExternal,
		Upstream: &upstream,
		Status:   domain.ProjectStatusReady,
	}

	if _, err := manager.Ensure(context.Background(), project); !errors.Is(err, ErrUnreachable) {
		t.Fatalf("expected ErrUnreachable, got %v", err)
	}
}

func TestEnsureRejectsAProjectWithoutAPort(t *testing.T) {
	manager := NewManager(Options{})
	project := domain.Project{ID: "noport", Name: "noport", Mode: domain.ProjectModeManaged}

	if _, err := manager.Ensure(context.Background(), project); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("expected ErrNotConfigured, got %v", err)
	}
}

func TestEnsureReportsAHealthTimeout(t *testing.T) {
	port := freePort(t)
	path := t.TempDir()
	manager := NewManager(Options{
		CrushBin:       writeFakeCrush(t, true),
		HealthTimeout:  300 * time.Millisecond,
		LogLines:       10,
		StopTimeout:    time.Second,
		PortStart:      port,
		HealthCacheTTL: time.Millisecond,
	})

	project := domain.Project{
		ID:     "silent",
		Name:   "silent",
		Mode:   domain.ProjectModeManaged,
		Path:   &path,
		Port:   &port,
		Status: domain.ProjectStatusReady,
	}

	if _, err := manager.Ensure(context.Background(), project); !errors.Is(err, ErrHealthTimeout) {
		t.Fatalf("expected ErrHealthTimeout, got %v", err)
	}
	if status := manager.LiveStatus(project.ID); status == StatusUp {
		t.Fatalf("a server that never answered health must not report up")
	}
	if err := manager.Stop(context.Background(), project.ID); err != nil {
		t.Fatalf("stop after timeout: %v", err)
	}
}

func TestEnsureSpawnsThenStopTerminatesTheChild(t *testing.T) {
	port := freePort(t)
	path := t.TempDir()
	marker := filepath.Join(t.TempDir(), "pid")
	t.Setenv("CRUSH_FAKE_PID", marker)

	manager := NewManager(Options{
		CrushBin:             writeFakeCrush(t, false),
		PortStart:            port,
		HealthTimeout:        10 * time.Second,
		HealthPollInterval:   20 * time.Millisecond,
		HealthRequestTimeout: 500 * time.Millisecond,
		HealthCacheTTL:       time.Second,
		StopTimeout:          5 * time.Second,
		LogLines:             50,
	})

	project := domain.Project{
		ID:     "managed",
		Name:   "managed",
		Mode:   domain.ProjectModeManaged,
		Path:   &path,
		Port:   &port,
		Status: domain.ProjectStatusReady,
	}

	upstream, err := manager.Ensure(context.Background(), project)
	if err != nil {
		t.Fatalf("ensure: %v", err)
	}
	want := fmt.Sprintf("http://127.0.0.1:%d", port)
	if upstream != want {
		t.Fatalf("got %q, want %q", upstream, want)
	}
	if status := manager.LiveStatus(project.ID); status != StatusUp {
		t.Fatalf("got status %q, want %q", status, StatusUp)
	}

	lines := strings.Join(manager.Logs(project.ID), "\n")
	if !strings.Contains(lines, fmt.Sprintf("fake crush on 127.0.0.1:%d", port)) {
		t.Fatalf("child output not captured, got %q", lines)
	}

	pid := readPID(t, marker)
	if err := manager.Stop(context.Background(), project.ID); err != nil {
		t.Fatalf("stop: %v", err)
	}
	if status := manager.LiveStatus(project.ID); status != StatusDown {
		t.Fatalf("got status %q after stop, want %q", status, StatusDown)
	}
	if err := syscall.Kill(pid, 0); !errors.Is(err, syscall.ESRCH) {
		t.Fatalf("child %d is still running after Stop: %v", pid, err)
	}
}

func TestEnsureRespawnsAfterTheChildDies(t *testing.T) {
	port := freePort(t)
	path := t.TempDir()
	manager := NewManager(Options{
		CrushBin:             writeFakeCrush(t, false),
		PortStart:            port,
		HealthTimeout:        10 * time.Second,
		HealthPollInterval:   20 * time.Millisecond,
		HealthRequestTimeout: 500 * time.Millisecond,
		HealthCacheTTL:       time.Millisecond,
		StopTimeout:          5 * time.Second,
	})

	project := domain.Project{
		ID:     "respawn",
		Name:   "respawn",
		Mode:   domain.ProjectModeManaged,
		Path:   &path,
		Port:   &port,
		Status: domain.ProjectStatusReady,
	}

	if _, err := manager.Ensure(context.Background(), project); err != nil {
		t.Fatalf("first ensure: %v", err)
	}
	if err := manager.Stop(context.Background(), project.ID); err != nil {
		t.Fatalf("stop: %v", err)
	}

	if _, err := manager.Ensure(context.Background(), project); err != nil {
		t.Fatalf("ensure after the child exited: %v", err)
	}
	if status := manager.LiveStatus(project.ID); status != StatusUp {
		t.Fatalf("got status %q after respawn, want %q", status, StatusUp)
	}
	if err := manager.Shutdown(context.Background()); err != nil {
		t.Fatalf("shutdown: %v", err)
	}
}

func writeFakeCrush(t *testing.T, silent bool) string {
	t.Helper()

	dir := t.TempDir()
	source := `package main

import (
	"fmt"
	"net/http"
	"os"
	"strings"
)

func main() {
	addr := ""
	for i, arg := range os.Args {
		if arg == "--host" && i+1 < len(os.Args) {
			addr = strings.TrimPrefix(os.Args[i+1], "tcp://")
		}
	}
	if marker := os.Getenv("CRUSH_FAKE_PID"); marker != "" {
		os.WriteFile(marker, []byte(fmt.Sprint(os.Getpid())), 0o600)
	}
	if ` + strconv.FormatBool(!silent) + ` {
		fmt.Println("fake crush on " + strings.TrimPrefix(addr, "tcp://"))
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/v1/health", func(w http.ResponseWriter, r *http.Request) {
		if ` + strconv.FormatBool(!silent) + ` {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusServiceUnavailable)
	})
	if err := http.ListenAndServe(addr, mux); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}
`

	if err := os.WriteFile(filepath.Join(dir, "main.go"), []byte(source), 0o600); err != nil {
		t.Fatalf("write fake crush source: %v", err)
	}
	if err := os.WriteFile(filepath.Join(dir, "go.mod"), []byte("module fakecrush\n\ngo 1.26\n"), 0o600); err != nil {
		t.Fatalf("write fake crush go.mod: %v", err)
	}

	binary := filepath.Join(dir, "crush")
	cmd := exec.Command("go", "build", "-o", binary, ".")
	cmd.Dir = dir
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("build fake crush: %v: %s", err, out)
	}
	return binary
}

func readPID(t *testing.T, path string) int {
	t.Helper()

	var raw []byte
	var err error
	for attempt := 0; attempt < 100; attempt++ {
		raw, err = os.ReadFile(path)
		if err == nil && len(raw) > 0 {
			pid, convErr := strconv.Atoi(strings.TrimSpace(string(raw)))
			if convErr == nil {
				return pid
			}
		}
		time.Sleep(20 * time.Millisecond)
	}
	t.Fatalf("child never wrote its pid to %s: %v", path, err)
	return 0
}
