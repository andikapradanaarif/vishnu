// Package usecase holds the registry's business logic: validating an
// add-project request, reserving its port and directory, and merging the
// persisted lifecycle status with the process manager's runtime state.
package usecase

import (
	"context"
	"errors"
	"log/slog"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/dto"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/service/cloner"
	"github.com/andikapradanaarif/vishnu/internal/service/process"
)

type ProcessManager interface {
	Ensure(ctx context.Context, project domain.Project) (string, error)
	Stop(ctx context.Context, id string) error
	LiveStatus(id string) process.Status
	AllocPort(reserved []int) (int, error)
}

type Cloner interface {
	CheckAccess(ctx context.Context, url string) error
	Clone(ctx context.Context, url, destDir string, onDone func(error)) error
	AllocDir(slug string) (string, error)
}

type Workspaces interface {
	EnsureWorkspace(ctx context.Context, upstream, path string, create bool) (string, error)
}

type ProjectUsecase struct {
	projects   domain.ProjectRepository
	proc       ProcessManager
	cloner     Cloner
	workspaces Workspaces
}

func NewProjectUsecase(
	projects domain.ProjectRepository,
	proc ProcessManager,
	cloner Cloner,
	workspaces Workspaces,
) *ProjectUsecase {
	return &ProjectUsecase{
		projects:   projects,
		proc:       proc,
		cloner:     cloner,
		workspaces: workspaces,
	}
}

type CreateResult struct {
	Project dto.ProjectResponse
	Cloning bool
}

func (u *ProjectUsecase) Create(ctx context.Context, req dto.CreateProjectRequest) (CreateResult, error) {
	switch countSources(req) {
	case 1:
	default:
		return CreateResult{}, errs.ErrInvalidProject
	}

	switch {
	case strings.TrimSpace(req.RepoURL) != "":
		return u.createClone(ctx, req)
	case strings.TrimSpace(req.Path) != "":
		return u.createLink(ctx, req)
	default:
		return u.createExternal(ctx, req)
	}
}

func (u *ProjectUsecase) List(ctx context.Context) ([]dto.ProjectResponse, error) {
	projects, err := u.projects.List(ctx)
	if err != nil {
		return nil, err
	}

	out := make([]dto.ProjectResponse, 0, len(projects))
	for _, project := range projects {
		out = append(out, u.response(project))
	}
	return out, nil
}

func (u *ProjectUsecase) Delete(ctx context.Context, id string) error {
	project, err := u.projects.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if project.Mode == domain.ProjectModeManaged {
		if err := u.proc.Stop(ctx, id); err != nil {
			slog.Warn("Failed to stop the project's crush server", "project", id, "error", err)
		}
	}
	return u.projects.SoftDelete(ctx, id)
}

func (u *ProjectUsecase) EnsureWorkspace(ctx context.Context, id string) (dto.WorkspaceResponse, error) {
	project, err := u.projects.GetByID(ctx, id)
	if err != nil {
		return dto.WorkspaceResponse{}, err
	}

	upstream, err := u.proc.Ensure(ctx, *project)
	if err != nil {
		return dto.WorkspaceResponse{}, err
	}

	var path string
	if project.Path != nil {
		path = *project.Path
	}

	workspaceID, err := u.workspaces.EnsureWorkspace(ctx, upstream, path, project.Mode == domain.ProjectModeManaged)
	if err != nil {
		return dto.WorkspaceResponse{}, err
	}

	return dto.WorkspaceResponse{
		WorkspaceID: workspaceID,
		Upstream:    upstream,
		Status:      string(process.StatusUp),
	}, nil
}

func (u *ProjectUsecase) createClone(ctx context.Context, req dto.CreateProjectRequest) (CreateResult, error) {
	normalized, slug, err := cloner.NormalizeRepoURL(req.RepoURL)
	if err != nil {
		return CreateResult{}, err
	}

	if err := u.cloner.CheckAccess(ctx, normalized); err != nil {
		return CreateResult{}, err
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = slug
	}

	dir, err := u.cloner.AllocDir(slug)
	if err != nil {
		return CreateResult{}, err
	}

	project := domain.Project{
		Name:    name,
		Path:    &dir,
		Mode:    domain.ProjectModeManaged,
		RepoURL: &normalized,
		Status:  domain.ProjectStatusCloning,
	}
	if err := u.createManaged(ctx, &project); err != nil {
		_ = os.Remove(dir)
		return CreateResult{}, err
	}

	// The clone outlives the request that started it, so its result is
	// written with a context of its own.
	cloneCtx, cancel := context.WithCancel(context.Background())
	if err := u.cloner.Clone(cloneCtx, normalized, dir, func(err error) {
		defer cancel()

		status, message := domain.ProjectStatusReady, ""
		if err != nil {
			status, message = domain.ProjectStatusError, err.Error()
		}
		if setErr := u.projects.SetStatus(context.Background(), project.ID, status, message); setErr != nil {
			slog.Error("Failed to record the clone result", "project", project.ID, "error", setErr)
		}
	}); err != nil {
		cancel()
		return CreateResult{}, err
	}

	return CreateResult{Project: u.response(project), Cloning: true}, nil
}

func (u *ProjectUsecase) createLink(ctx context.Context, req dto.CreateProjectRequest) (CreateResult, error) {
	path := strings.TrimSpace(req.Path)

	info, err := os.Stat(path)
	if err != nil || !info.IsDir() {
		return CreateResult{}, errs.ErrInvalidPath
	}

	absolute, err := filepath.Abs(path)
	if err != nil {
		return CreateResult{}, errs.ErrInvalidPath
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = filepath.Base(absolute)
	}

	project := domain.Project{
		Name:   name,
		Path:   &absolute,
		Mode:   domain.ProjectModeManaged,
		Status: domain.ProjectStatusReady,
	}
	if err := u.createManaged(ctx, &project); err != nil {
		return CreateResult{}, err
	}

	return CreateResult{Project: u.response(project)}, nil
}

func (u *ProjectUsecase) createExternal(ctx context.Context, req dto.CreateProjectRequest) (CreateResult, error) {
	upstream := strings.TrimSpace(req.Upstream)

	parsed, err := url.Parse(upstream)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
		return CreateResult{}, errs.ErrInvalidUpstream
	}

	name := strings.TrimSpace(req.Name)
	if name == "" {
		name = parsed.Host
	}

	project := domain.Project{
		Name:     name,
		Mode:     domain.ProjectModeExternal,
		Upstream: &upstream,
		Status:   domain.ProjectStatusReady,
	}
	if err := u.projects.Create(ctx, &project); err != nil {
		return CreateResult{}, err
	}

	return CreateResult{Project: u.response(project)}, nil
}

func (u *ProjectUsecase) response(project domain.Project) dto.ProjectResponse {
	response := dto.ProjectResponse{
		ID:     project.ID,
		Name:   project.Name,
		Mode:   string(project.Mode),
		Status: u.effectiveStatus(project),
	}
	if project.Path != nil {
		response.Path = *project.Path
	}
	if project.RepoURL != nil {
		response.RepoURL = *project.RepoURL
	}
	if project.Upstream != nil {
		response.Upstream = *project.Upstream
	}
	if project.Port != nil {
		response.Port = *project.Port
	}
	if project.Error != nil {
		response.Error = *project.Error
	}
	return response
}

// effectiveStatus merges the persisted lifecycle with the process manager's
// runtime view. A ready project reports what the manager observes: `up` when
// the upstream answers a health check, `down` for an unreachable external
// server or a managed one that has not spawned yet.
func (u *ProjectUsecase) effectiveStatus(project domain.Project) string {
	if project.Status != domain.ProjectStatusReady {
		return string(project.Status)
	}
	return string(u.proc.LiveStatus(project.ID))
}

// reservedPorts lists the ports the registry already claims. A project whose
// crush has not spawned yet owns a port that nothing is listening on, so the
// process manager cannot discover it by probing alone.
func (u *ProjectUsecase) reservedPorts(ctx context.Context) ([]int, error) {
	projects, err := u.projects.List(ctx)
	if err != nil {
		return nil, err
	}

	ports := make([]int, 0, len(projects))
	for _, project := range projects {
		if project.Port != nil {
			ports = append(ports, *project.Port)
		}
	}
	return ports, nil
}

const portAllocationAttempts = 5

// createManaged inserts a managed project, re-allocating its port when a
// concurrent create claimed the same one first. The unique index on
// projects.port is the authority here; the registry snapshot can be stale by
// the time the row lands.
func (u *ProjectUsecase) createManaged(ctx context.Context, project *domain.Project) error {
	var last error
	for attempt := 0; attempt < portAllocationAttempts; attempt++ {
		reserved, err := u.reservedPorts(ctx)
		if err != nil {
			return err
		}
		port, err := u.proc.AllocPort(reserved)
		if err != nil {
			return err
		}
		project.Port = &port

		last = u.projects.Create(ctx, project)
		if last == nil {
			return nil
		}
		if !errors.Is(last, errs.ErrPortConflict) {
			return last
		}
	}
	return last
}

func countSources(req dto.CreateProjectRequest) int {
	count := 0
	for _, value := range []string{req.RepoURL, req.Path, req.Upstream} {
		if strings.TrimSpace(value) != "" {
			count++
		}
	}
	return count
}
