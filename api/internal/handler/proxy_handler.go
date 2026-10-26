// Package handler wires HTTP routes to services.
package handler

import (
	"bufio"
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/service"
)

type ProjectLocator interface {
	GetByID(ctx context.Context, id string) (*domain.Project, error)
}

type UpstreamResolver interface {
	Ensure(ctx context.Context, project domain.Project) (string, error)
}

type AgentEnsurer interface {
	EnsureAgent(ctx context.Context, upstream, workspaceID string) error
}

// ProxyHandler forwards /p/{pid}/v1/* requests to that project's crush
// server. Responses — including the SSE event stream — are streamed
// through a bufio writer with a flush per read so events are delivered as
// they arrive. The project is resolved per request from the registry, so
// only the upstream lookup is dynamic; the streaming mechanics are not.
type ProxyHandler struct {
	projects  ProjectLocator
	proc      UpstreamResolver
	agents    AgentEnsurer
	client    *service.Proxy
	agentInit sync.Map
}

func NewProxyHandler(projects ProjectLocator, proc UpstreamResolver, agents AgentEnsurer, client *service.Proxy) *ProxyHandler {
	return &ProxyHandler{projects: projects, proc: proc, agents: agents, client: client}
}

func (h *ProxyHandler) Forward(c fiber.Ctx) error {
	pid := c.Params("pid")

	project, err := h.projects.GetByID(c.RequestCtx(), pid)
	if err != nil {
		if errors.Is(err, errs.ErrProjectNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"message": "unknown project", "code": "not_found"})
		}
		slog.Error("Failed to load the project for a proxied request", "project", pid, "error", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"message": "failed to load project", "code": "internal_error"})
	}

	switch project.Status {
	case domain.ProjectStatusCloning:
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"message": "project is still cloning", "code": "cloning"})
	case domain.ProjectStatusError:
		message := "project failed to clone"
		if project.Error != nil && *project.Error != "" {
			message = *project.Error
		}
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"message": message, "code": "project_error"})
	}

	upstream, err := h.proc.Ensure(c.RequestCtx(), *project)
	if err != nil {
		slog.Warn("Project upstream unavailable", "project", pid, "error", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{"message": "crush upstream unreachable", "code": "crush_unreachable"})
	}

	// The registry has no knowledge of session paths, so the prefix is
	// stripped here and only the crush-shaped part is forwarded.
	requestURI := strings.TrimPrefix(c.OriginalURL(), "/p/"+pid)
	if !strings.HasPrefix(requestURI, "/") {
		requestURI = "/" + requestURI
	}

	// Sessions-list is the SPA's "project opened" signal — lazily init
	// the workspace's agent coordinator in the background so a crush
	// that restarted (or predates select-time init) doesn't answer
	// prompts with "agent coordinator not initialized".
	if c.Method() == fiber.MethodGet {
		if wid := sessionsListWorkspace(requestURI); wid != "" {
			h.ensureAgent(upstream, pid, wid)
		}
	}

	// The upstream request is cancelled when the stream writer exits —
	// which happens when the response finishes or the client disconnects.
	ctx, cancel := context.WithCancel(context.Background())

	header := make(http.Header)
	for key, value := range c.GetReqHeaders() {
		for _, v := range value {
			header.Add(key, v)
		}
	}

	resp, err := h.client.Forward(ctx, upstream, c.Method(), requestURI, header, c.Body())
	if err != nil {
		cancel()
		slog.Warn("Upstream request failed", "project", pid, "method", c.Method(), "url", requestURI, "error", err)
		return c.Status(fiber.StatusBadGateway).JSON(fiber.Map{
			"message": "crush upstream unreachable",
			"code":    "crush_unreachable",
		})
	}

	c.Status(resp.StatusCode)
	for key, values := range resp.Header {
		if hopHeader(key) || strings.EqualFold(key, "Content-Length") || strings.EqualFold(key, "Content-Encoding") {
			continue
		}
		for _, value := range values {
			// Content-Type goes through Set: Appending leaves Fiber's own
			// content-type field unset, so it adds its default and the
			// event stream ends up advertising text/plain as well.
			if strings.EqualFold(key, "Content-Type") {
				c.Set(key, value)
				continue
			}
			c.Append(key, value)
		}
	}
	c.Set("X-Accel-Buffering", "no")

	return c.SendStreamWriter(func(w *bufio.Writer) {
		defer func() {
			_ = resp.Body.Close()
			cancel()
		}()
		buf := make([]byte, 32*1024)
		for {
			n, readErr := resp.Body.Read(buf)
			if n > 0 {
				if _, writeErr := w.Write(buf[:n]); writeErr != nil {
					return
				}
				if flushErr := w.Flush(); flushErr != nil {
					return
				}
			}
			if readErr != nil {
				if readErr != io.EOF {
					slog.Debug("Upstream stream ended", "error", readErr)
				}
				return
			}
		}
	})
}

// agentInitRecheck bounds how often a sessions-list request re-checks a
// workspace's agent — the SPA polls sessions, so a per-request ensure
// would spam the upstream with GET /agent calls. A failed ensure drops
// the marker so the next request retries instead of waiting the TTL.
const agentInitRecheck = 30 * time.Second

func (h *ProxyHandler) ensureAgent(upstream, pid, workspaceID string) {
	key := pid + "/" + workspaceID
	now := time.Now()
	if last, loaded := h.agentInit.LoadOrStore(key, now); loaded {
		lastAt, ok := last.(time.Time)
		if ok && now.Sub(lastAt) < agentInitRecheck {
			return
		}
		if !h.agentInit.CompareAndSwap(key, last, now) {
			return
		}
	}
	go func() {
		if err := h.agents.EnsureAgent(context.Background(), upstream, workspaceID); err != nil {
			slog.Warn("Agent init ensure failed", "project", pid, "workspace", workspaceID, "error", err)
			h.agentInit.Delete(key)
		}
	}()
}

// sessionsListWorkspace extracts the workspace id from a
// /v1/workspaces/{id}/sessions request path, "" otherwise.
func sessionsListWorkspace(requestURI string) string {
	const prefix, suffix = "/v1/workspaces/", "/sessions"
	path, _, _ := strings.Cut(requestURI, "?")
	if !strings.HasPrefix(path, prefix) || !strings.HasSuffix(path, suffix) {
		return ""
	}
	id := strings.TrimSuffix(strings.TrimPrefix(path, prefix), suffix)
	if id == "" || strings.Contains(id, "/") {
		return ""
	}
	return id
}

func hopHeader(key string) bool {
	switch http.CanonicalHeaderKey(key) {
	case "Connection", "Keep-Alive", "Proxy-Authenticate", "Proxy-Authorization", "Te", "Trailer", "Transfer-Encoding", "Upgrade":
		return true
	}
	return false
}
