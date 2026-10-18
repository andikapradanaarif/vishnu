// Package process lazily spawns and tracks one `crush server` child per
// managed project. Children are bound to the manager's lifetime, not to
// the request that triggered the spawn, so a finished HTTP request never
// kills a running agent.
package process

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"sync"
	"syscall"
	"time"

	"github.com/andikapradanaarif/vishnu/internal/domain"
)

type Status string

const (
	StatusDown     Status = "down"
	StatusStarting Status = "starting"
	StatusUp       Status = "up"
)

var (
	ErrHealthTimeout = errors.New("crush server did not become healthy in time")
	ErrUnreachable   = errors.New("crush server unreachable")
	ErrNotConfigured = errors.New("project has neither a port nor an upstream")
)

type Options struct {
	CrushBin             string
	PortStart            int
	HealthTimeout        time.Duration
	HealthPollInterval   time.Duration
	HealthRequestTimeout time.Duration
	HealthCacheTTL       time.Duration
	StopTimeout          time.Duration
	LogLines             int
}

func LoadOptions() Options {
	return Options{
		CrushBin:             getenv("VISHNU_CRUSH_BIN", "crush"),
		PortStart:            getenvInt("VISHNU_PORT_START", 9201),
		HealthTimeout:        15 * time.Second,
		HealthPollInterval:   100 * time.Millisecond,
		HealthRequestTimeout: 500 * time.Millisecond,
		HealthCacheTTL:       3 * time.Second,
		StopTimeout:          5 * time.Second,
		LogLines:             1000,
	}
}

type Manager struct {
	opts    Options
	client  *http.Client
	mu      sync.Mutex
	entries map[string]*entry
}

type entry struct {
	mu       sync.Mutex
	cmd      *exec.Cmd
	done     chan struct{}
	logs     *RingBuffer
	upstream string
	external bool
	port     int
	healthy  bool
	checked  time.Time
	exited   bool
}

func NewManager(opts Options) *Manager {
	defaults := LoadOptions()
	if opts.CrushBin == "" {
		opts.CrushBin = defaults.CrushBin
	}
	if opts.PortStart == 0 {
		opts.PortStart = defaults.PortStart
	}
	if opts.HealthTimeout == 0 {
		opts.HealthTimeout = defaults.HealthTimeout
	}
	if opts.HealthPollInterval == 0 {
		opts.HealthPollInterval = defaults.HealthPollInterval
	}
	if opts.HealthRequestTimeout == 0 {
		opts.HealthRequestTimeout = defaults.HealthRequestTimeout
	}
	if opts.HealthCacheTTL == 0 {
		opts.HealthCacheTTL = defaults.HealthCacheTTL
	}
	if opts.StopTimeout == 0 {
		opts.StopTimeout = defaults.StopTimeout
	}
	if opts.LogLines == 0 {
		opts.LogLines = defaults.LogLines
	}

	return &Manager{
		opts:    opts,
		client:  &http.Client{Timeout: opts.HealthRequestTimeout},
		entries: map[string]*entry{},
	}
}

func (m *Manager) Ensure(ctx context.Context, project domain.Project) (string, error) {
	if project.Mode == domain.ProjectModeExternal {
		upstream := value(project.Upstream)
		if upstream == "" {
			return "", ErrNotConfigured
		}

		e := m.entry(project.ID)
		e.mu.Lock()
		defer e.mu.Unlock()

		e.external = true
		e.upstream = upstream

		if m.fresh(e) {
			return upstream, nil
		}
		if !m.healthy(ctx, upstream) {
			return "", fmt.Errorf("%w: %s", ErrUnreachable, upstream)
		}
		m.markHealthy(e)
		return upstream, nil
	}

	if project.Port == nil || *project.Port == 0 || project.Path == nil || *project.Path == "" {
		return "", ErrNotConfigured
	}

	e := m.entry(project.ID)
	e.mu.Lock()
	defer e.mu.Unlock()

	e.port = *project.Port
	e.upstream = fmt.Sprintf("http://127.0.0.1:%d", e.port)

	if m.fresh(e) {
		return e.upstream, nil
	}

	if e.cmd == nil || e.exited {
		if err := m.spawn(project, e); err != nil {
			return "", err
		}
	}

	if err := m.waitHealthy(ctx, e); err != nil {
		m.signal(e, syscall.SIGTERM)
		return "", err
	}
	return e.upstream, nil
}

func (m *Manager) Stop(ctx context.Context, id string) error {
	e := m.lookup(id)
	if e == nil {
		return nil
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	if e.cmd == nil || e.exited {
		m.forget(id)
		return nil
	}

	m.signal(e, syscall.SIGTERM)

	deadline := m.opts.StopTimeout
	if d, ok := ctx.Deadline(); ok {
		deadline = time.Until(d)
	}

	select {
	case <-e.done:
	case <-time.After(deadline):
		slog.Warn("Crush server ignored SIGTERM, killing", "project", id)
		m.signal(e, syscall.SIGKILL)
		<-e.done
	}

	m.forget(id)
	return nil
}

func (m *Manager) Shutdown(ctx context.Context) error {
	for _, id := range m.ids() {
		if err := m.Stop(ctx, id); err != nil {
			return err
		}
	}
	return nil
}

func (m *Manager) LiveStatus(id string) Status {
	e := m.lookup(id)
	if e == nil {
		return StatusDown
	}

	e.mu.Lock()
	defer e.mu.Unlock()

	if e.external {
		if m.fresh(e) {
			return StatusUp
		}
		if m.healthy(context.Background(), e.upstream) {
			m.markHealthy(e)
			return StatusUp
		}
		return StatusDown
	}

	if e.cmd == nil || e.exited {
		return StatusDown
	}
	if m.fresh(e) {
		return StatusUp
	}
	if m.healthy(context.Background(), e.upstream) {
		m.markHealthy(e)
		return StatusUp
	}
	return StatusStarting
}

func (m *Manager) Logs(id string) []string {
	e := m.lookup(id)
	if e == nil {
		return nil
	}
	return e.logs.Lines()
}

func (m *Manager) AllocPort() (int, error) {
	for port := m.opts.PortStart; port < m.opts.PortStart+1000; port++ {
		listener, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", port))
		if err != nil {
			continue
		}
		_ = listener.Close()
		return port, nil
	}
	return 0, fmt.Errorf("no free port in %d..%d", m.opts.PortStart, m.opts.PortStart+1000)
}

func (m *Manager) spawn(project domain.Project, e *entry) error {
	cmd := exec.Command(
		m.opts.CrushBin, "server",
		"--host", fmt.Sprintf("tcp://127.0.0.1:%d", e.port),
	)
	cmd.Dir = *project.Path
	cmd.Stdout = e.logs
	cmd.Stderr = e.logs
	cmd.SysProcAttr = &syscall.SysProcAttr{Setpgid: true}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start crush server for %s: %w", project.Name, err)
	}

	e.cmd = cmd
	e.exited = false
	e.done = make(chan struct{})
	slog.Info("Started crush server", "project", project.Name, "pid", cmd.Process.Pid, "port", e.port)

	go func() {
		err := cmd.Wait()
		close(e.done)
		e.mu.Lock()
		e.exited = true
		e.healthy = false
		e.mu.Unlock()
		if err != nil {
			slog.Warn("Crush server exited", "project", project.Name, "error", err)
		}
	}()

	return nil
}

func (m *Manager) waitHealthy(ctx context.Context, e *entry) error {
	deadline := time.Now().Add(m.opts.HealthTimeout)
	for {
		if m.healthy(ctx, e.upstream) {
			m.markHealthy(e)
			return nil
		}
		if time.Now().After(deadline) {
			return fmt.Errorf("%w: %s", ErrHealthTimeout, e.upstream)
		}
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(m.opts.HealthPollInterval):
		}
	}
}

func (m *Manager) fresh(e *entry) bool {
	return e.healthy && time.Since(e.checked) < m.opts.HealthCacheTTL
}

func (m *Manager) markHealthy(e *entry) {
	e.healthy = true
	e.checked = time.Now()
}

func (m *Manager) healthy(ctx context.Context, upstream string) bool {
	if upstream == "" {
		return false
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, upstream+"/v1/health", nil)
	if err != nil {
		return false
	}

	resp, err := m.client.Do(req)
	if err != nil {
		return false
	}
	_ = resp.Body.Close()

	return resp.StatusCode >= 200 && resp.StatusCode < 300
}

func (m *Manager) signal(e *entry, sig syscall.Signal) {
	if e.cmd == nil || e.cmd.Process == nil {
		return
	}
	if err := e.cmd.Process.Signal(sig); err != nil && !errors.Is(err, os.ErrProcessDone) {
		slog.Warn("Failed to signal crush server", "pid", e.cmd.Process.Pid, "signal", sig, "error", err)
	}
}

func (m *Manager) entry(id string) *entry {
	m.mu.Lock()
	defer m.mu.Unlock()

	e, ok := m.entries[id]
	if !ok {
		e = &entry{logs: NewRingBuffer(m.opts.LogLines)}
		m.entries[id] = e
	}
	return e
}

func (m *Manager) lookup(id string) *entry {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.entries[id]
}

func (m *Manager) forget(id string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.entries, id)
}

func (m *Manager) ids() []string {
	m.mu.Lock()
	defer m.mu.Unlock()

	ids := make([]string, 0, len(m.entries))
	for id := range m.entries {
		ids = append(ids, id)
	}
	return ids
}

func value(p *string) string {
	if p == nil {
		return ""
	}
	return *p
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getenvInt(key string, fallback int) int {
	v, err := strconv.Atoi(os.Getenv(key))
	if err != nil || v == 0 {
		return fallback
	}
	return v
}
