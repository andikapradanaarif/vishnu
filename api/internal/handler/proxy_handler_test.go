package handler

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/service"
	"github.com/andikapradanaarif/vishnu/internal/service/process"
)

type fakeLocator struct {
	projects map[string]*domain.Project
}

func (f *fakeLocator) GetByID(_ context.Context, id string) (*domain.Project, error) {
	project, ok := f.projects[id]
	if !ok {
		return nil, errs.ErrProjectNotFound
	}
	return project, nil
}

func externalProject(id, upstream string, status domain.ProjectStatus) *domain.Project {
	return &domain.Project{
		ID:       id,
		Name:     id,
		Mode:     domain.ProjectModeExternal,
		Upstream: &upstream,
		Status:   status,
	}
}

func proxyApp(projects ...*domain.Project) *fiber.App {
	locator := &fakeLocator{projects: map[string]*domain.Project{}}
	for _, project := range projects {
		locator.projects[project.ID] = project
	}

	manager := process.NewManager(process.Options{
		HealthTimeout:        time.Second,
		HealthPollInterval:   10 * time.Millisecond,
		HealthRequestTimeout: 300 * time.Millisecond,
		HealthCacheTTL:       time.Millisecond,
	})

	app := fiber.New()
	app.All("/p/:pid/v1/*", NewProxyHandler(locator, manager, service.NewProxy()).Forward)
	return app
}

func echoUpstream(t *testing.T, name string) *httptest.Server {
	t.Helper()

	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/health" {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.Header().Set("X-Upstream", name)
		_, _ = w.Write([]byte(name + " " + r.URL.Path + "?" + r.URL.RawQuery))
	}))
}

func get(t *testing.T, app *fiber.App, target string) (int, http.Header, string) {
	t.Helper()

	resp, err := app.Test(httptest.NewRequest("GET", target, nil))
	if err != nil {
		t.Fatalf("GET %s: %v", target, err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	return resp.StatusCode, resp.Header, string(body)
}

func TestForwardRoutesEachProjectToItsOwnUpstream(t *testing.T) {
	first := echoUpstream(t, "first")
	defer first.Close()
	second := echoUpstream(t, "second")
	defer second.Close()

	app := proxyApp(
		externalProject("a", first.URL, domain.ProjectStatusReady),
		externalProject("b", second.URL, domain.ProjectStatusReady),
	)

	status, header, body := get(t, app, "/p/a/v1/workspaces?client_id=c1")
	if status != fiber.StatusOK {
		t.Fatalf("got %d, want 200: %s", status, body)
	}
	if header.Get("X-Upstream") != "first" {
		t.Fatalf("request for project a reached %q", header.Get("X-Upstream"))
	}
	if body != "first /v1/workspaces?client_id=c1" {
		t.Fatalf("unexpected forwarded request: %q", body)
	}

	status, header, body = get(t, app, "/p/b/v1/workspaces/w1/sessions")
	if status != fiber.StatusOK {
		t.Fatalf("got %d, want 200: %s", status, body)
	}
	if header.Get("X-Upstream") != "second" {
		t.Fatalf("request for project b reached %q", header.Get("X-Upstream"))
	}
	if body != "second /v1/workspaces/w1/sessions?" {
		t.Fatalf("the project prefix was not stripped: %q", body)
	}
}

func TestForwardDoesNotLeakSessionCredentialsUpstream(t *testing.T) {
	var cookie, authorization string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/health" {
			w.WriteHeader(http.StatusOK)
			return
		}
		cookie = r.Header.Get("Cookie")
		authorization = r.Header.Get("Authorization")
		w.WriteHeader(http.StatusOK)
	}))
	defer upstream.Close()

	app := proxyApp(externalProject("a", upstream.URL, domain.ProjectStatusReady))

	req := httptest.NewRequest("GET", "/p/a/v1/workspaces?client_id=c1", nil)
	req.Header.Set("Cookie", "vishnu_session=super-secret")
	req.Header.Set("Authorization", "Bearer super-secret")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("GET: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if cookie != "" {
		t.Fatalf("the session cookie reached the upstream: %q", cookie)
	}
	if authorization != "" {
		t.Fatalf("the authorization header reached the upstream: %q", authorization)
	}
}

func TestForwardStreamsEventStreamsThrough(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/event-stream")
		w.WriteHeader(http.StatusOK)

		flusher, ok := w.(http.Flusher)
		if !ok {
			t.Error("test upstream cannot flush")
			return
		}
		_, _ = w.Write([]byte("data: one\n\n"))
		flusher.Flush()
		time.Sleep(10 * time.Millisecond)
		_, _ = w.Write([]byte("data: two\n\n"))
		flusher.Flush()
	}))
	defer upstream.Close()

	app := proxyApp(externalProject("a", upstream.URL, domain.ProjectStatusReady))

	status, header, body := get(t, app, "/p/a/v1/workspaces/w1/events?client_id=c1")
	if status != fiber.StatusOK {
		t.Fatalf("got %d, want 200", status)
	}
	if got := header.Get("Content-Type"); !strings.HasPrefix(got, "text/event-stream") {
		t.Fatalf("got content type %q, want the event stream type", got)
	}
	if !strings.Contains(body, "data: one") || !strings.Contains(body, "data: two") {
		t.Fatalf("event stream not forwarded intact: %q", body)
	}
	if got := header.Get("X-Accel-Buffering"); got != "no" {
		t.Fatalf("got X-Accel-Buffering %q, want no", got)
	}
}

func TestForwardRejectsUnknownProjects(t *testing.T) {
	app := proxyApp()

	status, _, body := get(t, app, "/p/missing/v1/workspaces")
	if status != fiber.StatusNotFound || !strings.Contains(body, "not_found") {
		t.Fatalf("got %d %s, want 404 not_found", status, body)
	}
}

func TestForwardRefusesCloningAndFailedProjects(t *testing.T) {
	message := "clone failed: repository not found"

	cases := []struct {
		name    string
		project *domain.Project
		code    string
	}{
		{
			name:    "cloning",
			project: externalProject("c", "http://127.0.0.1:9", domain.ProjectStatusCloning),
			code:    "cloning",
		},
		{
			name: "error",
			project: func() *domain.Project {
				project := externalProject("e", "http://127.0.0.1:9", domain.ProjectStatusError)
				project.Error = &message
				return project
			}(),
			code: "project_error",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := proxyApp(tc.project)

			status, _, body := get(t, app, "/p/"+tc.project.ID+"/v1/workspaces")
			if status != fiber.StatusServiceUnavailable || !strings.Contains(body, tc.code) {
				t.Fatalf("got %d %s, want 503 %s", status, body, tc.code)
			}
		})
	}
}

func TestForwardReportsAnUnreachableUpstream(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))
	gone := upstream.URL
	upstream.Close()

	app := proxyApp(externalProject("a", gone, domain.ProjectStatusReady))

	status, _, body := get(t, app, "/p/a/v1/workspaces")
	if status != fiber.StatusBadGateway || !strings.Contains(body, "crush_unreachable") {
		t.Fatalf("got %d %s, want 502 crush_unreachable", status, body)
	}
}

func TestForwardPassesThroughUpstreamErrorStatuses(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/v1/health" {
			w.WriteHeader(http.StatusOK)
			return
		}
		w.WriteHeader(http.StatusConflict)
		_, _ = w.Write([]byte(`{"message":"conflict"}`))
	}))
	defer upstream.Close()

	app := proxyApp(externalProject("a", upstream.URL, domain.ProjectStatusReady))

	status, _, body := get(t, app, "/p/a/v1/workspaces/w1")
	if status != fiber.StatusConflict {
		t.Fatalf("got %d %s, want the upstream's 409", status, body)
	}
	if !strings.Contains(body, "conflict") {
		t.Fatalf("upstream body not forwarded: %q", body)
	}
}
