package handler

import (
	"context"
	"errors"
	"io"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"

	"github.com/andikapradanaarif/vishnu/internal/dto"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/service/cloner"
	"github.com/andikapradanaarif/vishnu/internal/service/process"
	"github.com/andikapradanaarif/vishnu/internal/usecase"
)

type fakeProjects struct {
	create       usecase.CreateResult
	createErr    error
	list         []dto.ProjectResponse
	deleteErr    error
	workspace    dto.WorkspaceResponse
	workspaceErr error
	deleted      []string
	skipProject  string
	skip         bool
	skipSet      bool
	skipResponse dto.ProjectResponse
	skipErr      error
	agentID      string
	agentSet     string
	agentApplied bool
	agentResp    dto.ProjectResponse
	agentErr     error
}

func (f *fakeProjects) Create(context.Context, dto.CreateProjectRequest) (usecase.CreateResult, error) {
	return f.create, f.createErr
}

func (f *fakeProjects) List(context.Context) ([]dto.ProjectResponse, error) {
	return f.list, nil
}

func (f *fakeProjects) Delete(_ context.Context, id string) error {
	f.deleted = append(f.deleted, id)
	return f.deleteErr
}

func (f *fakeProjects) EnsureWorkspace(context.Context, string) (dto.WorkspaceResponse, error) {
	return f.workspace, f.workspaceErr
}

func (f *fakeProjects) SetPermissionSkip(_ context.Context, id string, skip bool) (dto.ProjectResponse, error) {
	f.skipProject = id
	f.skip = skip
	f.skipSet = true
	return f.skipResponse, f.skipErr
}

func (f *fakeProjects) SetAgent(_ context.Context, id string, agent string) (dto.ProjectResponse, error) {
	f.agentID = id
	f.agentSet = agent
	f.agentApplied = true
	return f.agentResp, f.agentErr
}

func newTestApp(projects ProjectService) *fiber.App {
	app := fiber.New()
	NewProjectHandler(projects).Register(app)
	return app
}

func request(t *testing.T, app *fiber.App, method, target, body string) (int, string) {
	t.Helper()

	req := httptest.NewRequest(method, target, strings.NewReader(body))
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("%s %s: %v", method, target, err)
	}
	defer func() { _ = resp.Body.Close() }()

	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	return resp.StatusCode, string(payload)
}

func TestCreateProjectStatusReflectsTheMode(t *testing.T) {
	app := newTestApp(&fakeProjects{
		create: usecase.CreateResult{
			Project: dto.ProjectResponse{ID: "p1", Name: "repo", Status: "cloning"},
			Cloning: true,
		},
	})

	status, body := request(t, app, "POST", "/api/projects", `{"repo_url":"owner/repo"}`)
	if status != fiber.StatusAccepted {
		t.Fatalf("got %d for a clone, want 202: %s", status, body)
	}

	app = newTestApp(&fakeProjects{
		create: usecase.CreateResult{Project: dto.ProjectResponse{ID: "p2", Name: "local", Status: "ready"}},
	})
	status, body = request(t, app, "POST", "/api/projects", `{"path":"/tmp/local"}`)
	if status != fiber.StatusCreated {
		t.Fatalf("got %d for a link, want 201: %s", status, body)
	}
}

func TestCreateProjectRejectsAMalformedBody(t *testing.T) {
	app := newTestApp(&fakeProjects{})

	status, body := request(t, app, "POST", "/api/projects", "{")
	if status != fiber.StatusBadRequest || !strings.Contains(body, "invalid_request") {
		t.Fatalf("got %d %s, want 400 invalid_request", status, body)
	}
}

func TestCreateProjectMapsDomainErrorsToStatuses(t *testing.T) {
	cases := []struct {
		name     string
		err      error
		wantCode int
		wantBody string
	}{
		{"duplicate", errs.ErrProjectConflict, fiber.StatusConflict, "conflict"},
		{"unknown id", errs.ErrProjectNotFound, fiber.StatusNotFound, "not_found"},
		{"unreachable repo", cloner.ErrRepoUnreachable, fiber.StatusForbidden, "repository_unreachable"},
		{"unsupported repo", cloner.ErrUnsupportedRepo, fiber.StatusBadRequest, "invalid_request"},
		{"invalid path", errs.ErrInvalidPath, fiber.StatusBadRequest, "invalid_request"},
		{"spawn timeout", process.ErrHealthTimeout, fiber.StatusBadGateway, "crush_unreachable"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := newTestApp(&fakeProjects{createErr: tc.err})

			status, body := request(t, app, "POST", "/api/projects", `{"path":"/tmp/x"}`)
			if status != tc.wantCode || !strings.Contains(body, tc.wantBody) {
				t.Fatalf("got %d %s, want %d %s", status, body, tc.wantCode, tc.wantBody)
			}
		})
	}
}

func TestListProjectsReturnsTheRegistry(t *testing.T) {
	app := newTestApp(&fakeProjects{
		list: []dto.ProjectResponse{{ID: "p1", Name: "vishnu", Status: "up"}},
	})

	status, body := request(t, app, "GET", "/api/projects", "")
	if status != fiber.StatusOK || !strings.Contains(body, `"vishnu"`) {
		t.Fatalf("got %d %s, want the registry", status, body)
	}
}

func TestDeleteProjectRemovesItAndReports404ForUnknownIDs(t *testing.T) {
	projects := &fakeProjects{}
	app := newTestApp(projects)

	status, body := request(t, app, "DELETE", "/api/projects/abc", "")
	if status != fiber.StatusNoContent {
		t.Fatalf("got %d %s, want 204", status, body)
	}
	if len(projects.deleted) != 1 || projects.deleted[0] != "abc" {
		t.Fatalf("got %v, want the id passed through", projects.deleted)
	}

	app = newTestApp(&fakeProjects{deleteErr: errs.ErrProjectNotFound})
	status, body = request(t, app, "DELETE", "/api/projects/missing", "")
	if status != fiber.StatusNotFound || !strings.Contains(body, "not_found") {
		t.Fatalf("got %d %s, want 404 not_found", status, body)
	}
}

func TestEnsureWorkspaceReturnsTheWorkspace(t *testing.T) {
	app := newTestApp(&fakeProjects{
		workspace: dto.WorkspaceResponse{WorkspaceID: "w1", Upstream: "http://127.0.0.1:9201", Status: "up"},
	})

	status, body := request(t, app, "GET", "/api/projects/p1/workspace", "")
	if status != fiber.StatusOK || !strings.Contains(body, `"workspace_id":"w1"`) {
		t.Fatalf("got %d %s, want the workspace", status, body)
	}
}

func TestEnsureWorkspaceReportsAnUnreachableServer(t *testing.T) {
	app := newTestApp(&fakeProjects{workspaceErr: process.ErrUnreachable})

	status, body := request(t, app, "GET", "/api/projects/p1/workspace", "")
	if status != fiber.StatusBadGateway || !strings.Contains(body, "crush_unreachable") {
		t.Fatalf("got %d %s, want 502 crush_unreachable", status, body)
	}
}

func TestSetPermissionSkipStoresTheWorkspaceDefault(t *testing.T) {
	projects := &fakeProjects{
		skipResponse: dto.ProjectResponse{ID: "p1", Name: "one", Status: "up", PermissionSkip: true},
	}
	app := newTestApp(projects)

	status, body := request(t, app, "PUT", "/api/projects/p1/permissions/skip", `{"skip":true}`)
	if status != fiber.StatusOK || !strings.Contains(body, `"permission_skip":true`) {
		t.Fatalf("got %d %s, want the updated project", status, body)
	}
	if !projects.skipSet || projects.skipProject != "p1" || !projects.skip {
		t.Fatalf("got %+v, want the skip stored for p1", projects)
	}
}

func TestSetPermissionSkipRejectsAMalformedBody(t *testing.T) {
	app := newTestApp(&fakeProjects{})

	status, body := request(t, app, "PUT", "/api/projects/p1/permissions/skip", `{"skip":"yes"}`)
	if status != fiber.StatusBadRequest || !strings.Contains(body, "invalid_request") {
		t.Fatalf("got %d %s, want 400 invalid_request", status, body)
	}
}

func TestSetAgentStoresTheChoice(t *testing.T) {
	projects := &fakeProjects{
		agentResp: dto.ProjectResponse{ID: "p1", Name: "one", Status: "up", Agent: "plan"},
	}
	app := newTestApp(projects)

	status, body := request(t, app, "PUT", "/api/projects/p1/agent", `{"agent":"plan"}`)
	if status != fiber.StatusOK || !strings.Contains(body, `"agent":"plan"`) {
		t.Fatalf("got %d %s, want the updated project", status, body)
	}
	if !projects.agentApplied || projects.agentID != "p1" || projects.agentSet != "plan" {
		t.Fatalf("got %+v, want plan stored for p1", projects)
	}
}

func TestSetAgentRejectsAMalformedBody(t *testing.T) {
	app := newTestApp(&fakeProjects{})

	status, body := request(t, app, "PUT", "/api/projects/p1/agent", `{"agent":1}`)
	if status != fiber.StatusBadRequest || !strings.Contains(body, "invalid_request") {
		t.Fatalf("got %d %s, want 400 invalid_request", status, body)
	}
}

func TestStatusForUnknownErrorIsInternal(t *testing.T) {
	app := newTestApp(&fakeProjects{createErr: errors.New("boom")})

	status, body := request(t, app, "POST", "/api/projects", `{"path":"/tmp/x"}`)
	if status != fiber.StatusInternalServerError || !strings.Contains(body, "internal_error") {
		t.Fatalf("got %d %s, want 500 internal_error", status, body)
	}
}
