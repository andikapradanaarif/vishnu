package usecase

import (
	"context"
	"errors"
	"path/filepath"
	"testing"

	"github.com/google/uuid"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/dto"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/service/cloner"
	"github.com/andikapradanaarif/vishnu/internal/service/process"
)

type fakeRepo struct {
	projects map[string]*domain.Project
	conflict bool
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{projects: map[string]*domain.Project{}}
}

func (f *fakeRepo) List(context.Context) ([]domain.Project, error) {
	out := make([]domain.Project, 0, len(f.projects))
	for _, project := range f.projects {
		out = append(out, *project)
	}
	return out, nil
}

func (f *fakeRepo) GetByID(_ context.Context, id string) (*domain.Project, error) {
	project, ok := f.projects[id]
	if !ok {
		return nil, errs.ErrProjectNotFound
	}
	copy := *project
	return &copy, nil
}

func (f *fakeRepo) Create(_ context.Context, project *domain.Project) error {
	if f.conflict {
		return errs.ErrProjectConflict
	}
	if project.ID == "" {
		project.ID = uuid.NewString()
	}
	copy := *project
	f.projects[project.ID] = &copy
	return nil
}

func (f *fakeRepo) Update(_ context.Context, project *domain.Project) error {
	copy := *project
	f.projects[project.ID] = &copy
	return nil
}

func (f *fakeRepo) SoftDelete(_ context.Context, id string) error {
	if _, ok := f.projects[id]; !ok {
		return errs.ErrProjectNotFound
	}
	delete(f.projects, id)
	return nil
}

func (f *fakeRepo) SetStatus(_ context.Context, id string, status domain.ProjectStatus, errMsg string) error {
	project, ok := f.projects[id]
	if !ok {
		return errs.ErrProjectNotFound
	}
	project.Status = status
	if errMsg == "" {
		project.Error = nil
	} else {
		project.Error = &errMsg
	}
	return nil
}

type fakeProc struct {
	status    process.Status
	upstream  string
	ensureErr error
	port      int
	reserved  []int
	stopped   []string
}

func (f *fakeProc) Ensure(context.Context, domain.Project) (string, error) {
	if f.ensureErr != nil {
		return "", f.ensureErr
	}
	return f.upstream, nil
}

func (f *fakeProc) Stop(_ context.Context, id string) error {
	f.stopped = append(f.stopped, id)
	return nil
}

func (f *fakeProc) LiveStatus(string) process.Status {
	if f.status == "" {
		return process.StatusDown
	}
	return f.status
}

func (f *fakeProc) AllocPort(reserved []int) (int, error) {
	f.reserved = reserved
	if f.port == 0 {
		return 9201, nil
	}
	return f.port, nil
}

type fakeCloner struct {
	accessErr error
	dir       string
	clonedURL string
}

func (f *fakeCloner) CheckAccess(context.Context, string) error {
	return f.accessErr
}

func (f *fakeCloner) Clone(_ context.Context, url, _ string, onDone func(error)) error {
	f.clonedURL = url
	onDone(nil)
	return nil
}

func (f *fakeCloner) AllocDir(slug string) (string, error) {
	if f.dir == "" {
		return filepath.Join("/tmp", slug), nil
	}
	return f.dir, nil
}

type fakeWorkspaces struct {
	id     string
	err    error
	calls  int
	create bool
}

func (f *fakeWorkspaces) EnsureWorkspace(_ context.Context, _, _ string, create bool) (string, error) {
	f.calls++
	f.create = create
	return f.id, f.err
}

func newUsecase(repo *fakeRepo, proc *fakeProc, c *fakeCloner, ws *fakeWorkspaces) *ProjectUsecase {
	return NewProjectUsecase(repo, proc, c, ws)
}

func TestCreateCloneReservesPortAndRecordsTheClone(t *testing.T) {
	repo := newFakeRepo()
	clonerFake := &fakeCloner{}
	usecase := newUsecase(repo, &fakeProc{port: 9300}, clonerFake, &fakeWorkspaces{})

	result, err := usecase.Create(context.Background(), dto.CreateProjectRequest{
		RepoURL: "owner/repo",
	})
	if err != nil {
		t.Fatalf("create clone: %v", err)
	}
	if !result.Cloning {
		t.Fatal("a clone-backed project must be reported as still cloning")
	}
	if result.Project.Port != 9300 || result.Project.Mode != string(domain.ProjectModeManaged) {
		t.Fatalf("unexpected project: %+v", result.Project)
	}
	if result.Project.Status != string(domain.ProjectStatusCloning) {
		t.Fatalf("got status %q, want cloning", result.Project.Status)
	}
	if clonerFake.clonedURL != "https://github.com/owner/repo" {
		t.Fatalf("got clone url %q", clonerFake.clonedURL)
	}

	stored := repo.projects[result.Project.ID]
	if stored.Status != domain.ProjectStatusReady {
		t.Fatalf("got stored status %q, want ready once the clone reported success", stored.Status)
	}
}

func TestCreateCloneRejectsNonGithubReferences(t *testing.T) {
	usecase := newUsecase(newFakeRepo(), &fakeProc{}, &fakeCloner{}, &fakeWorkspaces{})

	_, err := usecase.Create(context.Background(), dto.CreateProjectRequest{
		RepoURL: "https://gitlab.com/owner/repo",
	})
	if !errors.Is(err, cloner.ErrUnsupportedRepo) {
		t.Fatalf("expected ErrUnsupportedRepo, got %v", err)
	}
}

func TestCreateCloneSurfacesAnUnreachableRepository(t *testing.T) {
	clonerFake := &fakeCloner{accessErr: cloner.ErrRepoUnreachable}
	usecase := newUsecase(newFakeRepo(), &fakeProc{}, clonerFake, &fakeWorkspaces{})

	_, err := usecase.Create(context.Background(), dto.CreateProjectRequest{RepoURL: "owner/repo"})
	if !errors.Is(err, cloner.ErrRepoUnreachable) {
		t.Fatalf("expected ErrRepoUnreachable, got %v", err)
	}
}

func TestCreateReservesPortsOfRegisteredProjects(t *testing.T) {
	repo := newFakeRepo()
	proc := &fakeProc{port: 9301}
	usecase := newUsecase(repo, proc, &fakeCloner{}, &fakeWorkspaces{})

	if _, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Path: t.TempDir()}); err != nil {
		t.Fatalf("create link: %v", err)
	}

	proc.port = 9302
	if _, err := usecase.Create(context.Background(), dto.CreateProjectRequest{RepoURL: "owner/repo"}); err != nil {
		t.Fatalf("create clone: %v", err)
	}

	if len(proc.reserved) != 1 || proc.reserved[0] != 9301 {
		t.Fatalf("got reserved %v, want the already-registered port 9301", proc.reserved)
	}
}

func TestCreateLinkUsesTheExistingDirectory(t *testing.T) {
	dir := t.TempDir()
	repo := newFakeRepo()
	usecase := newUsecase(repo, &fakeProc{port: 9301}, &fakeCloner{}, &fakeWorkspaces{})

	result, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Path: dir})
	if err != nil {
		t.Fatalf("create link: %v", err)
	}
	if result.Cloning {
		t.Fatal("linking a local path is not asynchronous")
	}
	if result.Project.Status != string(process.StatusDown) {
		t.Fatalf("got status %q, want down for a project whose server is not running", result.Project.Status)
	}
	if result.Project.Path != dir {
		t.Fatalf("got path %q, want %q", result.Project.Path, dir)
	}
	if filepath.Base(result.Project.Name) != filepath.Base(dir) {
		t.Fatalf("got name %q, want it derived from the path", result.Project.Name)
	}
}

func TestCreateLinkRejectsAMissingDirectory(t *testing.T) {
	usecase := newUsecase(newFakeRepo(), &fakeProc{}, &fakeCloner{}, &fakeWorkspaces{})

	_, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Path: "/definitely/not/here"})
	if !errors.Is(err, errs.ErrInvalidPath) {
		t.Fatalf("expected ErrInvalidPath, got %v", err)
	}
}

func TestCreateExternalOnlyRoutes(t *testing.T) {
	usecase := newUsecase(newFakeRepo(), &fakeProc{}, &fakeCloner{}, &fakeWorkspaces{})

	result, err := usecase.Create(context.Background(), dto.CreateProjectRequest{
		Upstream: "http://127.0.0.1:9119",
	})
	if err != nil {
		t.Fatalf("create external: %v", err)
	}
	if result.Project.Mode != string(domain.ProjectModeExternal) {
		t.Fatalf("got mode %q, want external", result.Project.Mode)
	}
	if result.Project.Port != 0 {
		t.Fatalf("an external project must not take a port, got %d", result.Project.Port)
	}
}

func TestCreateExternalRejectsAnInvalidUpstream(t *testing.T) {
	usecase := newUsecase(newFakeRepo(), &fakeProc{}, &fakeCloner{}, &fakeWorkspaces{})

	for _, upstream := range []string{"not-a-url", "ftp://127.0.0.1:9119", "127.0.0.1:9119"} {
		if _, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Upstream: upstream}); !errors.Is(err, errs.ErrInvalidUpstream) {
			t.Fatalf("expected %q to be rejected, got %v", upstream, err)
		}
	}
}

func TestCreateRequiresExactlyOneSource(t *testing.T) {
	usecase := newUsecase(newFakeRepo(), &fakeProc{}, &fakeCloner{}, &fakeWorkspaces{})

	for _, req := range []dto.CreateProjectRequest{
		{},
		{RepoURL: "owner/repo", Path: "/tmp"},
		{Path: "/tmp", Upstream: "http://127.0.0.1:9119"},
		{RepoURL: "owner/repo", Path: "/tmp", Upstream: "http://127.0.0.1:9119"},
	} {
		if _, err := usecase.Create(context.Background(), req); !errors.Is(err, errs.ErrInvalidProject) {
			t.Fatalf("expected ErrInvalidProject for %+v, got %v", req, err)
		}
	}
}

func TestCreateSurfacesADuplicate(t *testing.T) {
	repo := newFakeRepo()
	repo.conflict = true
	usecase := newUsecase(repo, &fakeProc{}, &fakeCloner{}, &fakeWorkspaces{})

	_, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Path: t.TempDir()})
	if !errors.Is(err, errs.ErrProjectConflict) {
		t.Fatalf("expected ErrProjectConflict, got %v", err)
	}
}

func TestDeleteStopsManagedServersOnly(t *testing.T) {
	repo := newFakeRepo()
	proc := &fakeProc{port: 9302}
	usecase := newUsecase(repo, proc, &fakeCloner{}, &fakeWorkspaces{})

	managed, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Path: t.TempDir()})
	if err != nil {
		t.Fatalf("create managed: %v", err)
	}
	external, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Upstream: "http://127.0.0.1:9119"})
	if err != nil {
		t.Fatalf("create external: %v", err)
	}

	if err := usecase.Delete(context.Background(), managed.Project.ID); err != nil {
		t.Fatalf("delete managed: %v", err)
	}
	if len(proc.stopped) != 1 || proc.stopped[0] != managed.Project.ID {
		t.Fatalf("expected the managed server to be stopped, got %v", proc.stopped)
	}
	if _, err := repo.GetByID(context.Background(), managed.Project.ID); !errors.Is(err, errs.ErrProjectNotFound) {
		t.Fatalf("expected the row to be removed, got %v", err)
	}

	if err := usecase.Delete(context.Background(), external.Project.ID); err != nil {
		t.Fatalf("delete external: %v", err)
	}
	if len(proc.stopped) != 1 {
		t.Fatalf("an external server must be left alone, got %v", proc.stopped)
	}
}

func TestDeleteUnknownProject(t *testing.T) {
	usecase := newUsecase(newFakeRepo(), &fakeProc{}, &fakeCloner{}, &fakeWorkspaces{})

	if err := usecase.Delete(context.Background(), uuid.NewString()); !errors.Is(err, errs.ErrProjectNotFound) {
		t.Fatalf("expected ErrProjectNotFound, got %v", err)
	}
}

func TestListMergesLiveStatusOverPersistedStatus(t *testing.T) {
	repo := newFakeRepo()
	proc := &fakeProc{port: 9303, status: process.StatusUp}
	usecase := newUsecase(repo, proc, &fakeCloner{}, &fakeWorkspaces{})

	linked, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Path: t.TempDir()})
	if err != nil {
		t.Fatalf("create link: %v", err)
	}
	if _, err := usecase.Create(context.Background(), dto.CreateProjectRequest{RepoURL: "owner/repo"}); err != nil {
		t.Fatalf("create clone: %v", err)
	}

	proc.status = process.StatusUp
	projects, err := usecase.List(context.Background())
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(projects) != 2 {
		t.Fatalf("expected 2 projects, got %d", len(projects))
	}

	seen := false
	for _, project := range projects {
		if project.ID == linked.Project.ID {
			seen = true
		}
		if project.Status != string(process.StatusUp) {
			t.Fatalf("%s: got status %q, want the live status up", project.Name, project.Status)
		}
	}
	if !seen {
		t.Fatal("the linked project is missing from the list")
	}
}

func TestListKeepsCloningAndErrorStates(t *testing.T) {
	repo := newFakeRepo()
	proc := &fakeProc{status: process.StatusUp}
	usecase := newUsecase(repo, proc, &fakeCloner{}, &fakeWorkspaces{})

	cloning := &domain.Project{ID: uuid.NewString(), Name: "cloning", Mode: domain.ProjectModeManaged, Status: domain.ProjectStatusCloning}
	failed := &domain.Project{ID: uuid.NewString(), Name: "failed", Mode: domain.ProjectModeManaged, Status: domain.ProjectStatusError}
	repo.projects[cloning.ID] = cloning
	repo.projects[failed.ID] = failed

	projects, err := usecase.List(context.Background())
	if err != nil {
		t.Fatalf("list: %v", err)
	}

	statuses := map[string]string{}
	for _, project := range projects {
		statuses[project.Name] = project.Status
	}
	if statuses["cloning"] != string(domain.ProjectStatusCloning) {
		t.Fatalf("got %q, want cloning", statuses["cloning"])
	}
	if statuses["failed"] != string(domain.ProjectStatusError) {
		t.Fatalf("got %q, want error", statuses["failed"])
	}
}

func TestEnsureWorkspaceReturnsTheUpstreamWorkspace(t *testing.T) {
	repo := newFakeRepo()
	proc := &fakeProc{upstream: "http://127.0.0.1:9304"}
	workspaces := &fakeWorkspaces{id: "workspace-1"}
	usecase := newUsecase(repo, proc, &fakeCloner{}, workspaces)

	linked, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Path: t.TempDir()})
	if err != nil {
		t.Fatalf("create link: %v", err)
	}

	workspace, err := usecase.EnsureWorkspace(context.Background(), linked.Project.ID)
	if err != nil {
		t.Fatalf("ensure workspace: %v", err)
	}
	if workspace.WorkspaceID != "workspace-1" || workspace.Upstream != "http://127.0.0.1:9304" {
		t.Fatalf("unexpected workspace: %+v", workspace)
	}
}

func TestEnsureWorkspaceSurfacesAnUnreachableServer(t *testing.T) {
	repo := newFakeRepo()
	proc := &fakeProc{ensureErr: process.ErrHealthTimeout}
	usecase := newUsecase(repo, proc, &fakeCloner{}, &fakeWorkspaces{})

	linked, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Path: t.TempDir()})
	if err != nil {
		t.Fatalf("create link: %v", err)
	}

	if _, err := usecase.EnsureWorkspace(context.Background(), linked.Project.ID); !errors.Is(err, process.ErrHealthTimeout) {
		t.Fatalf("expected ErrHealthTimeout, got %v", err)
	}
}

func TestEnsureWorkspaceLeavesExternalServersAlone(t *testing.T) {
	repo := newFakeRepo()
	proc := &fakeProc{upstream: "http://127.0.0.1:9119"}
	workspaces := &fakeWorkspaces{id: "workspace-9"}
	usecase := newUsecase(repo, proc, &fakeCloner{}, workspaces)

	external, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Upstream: "http://127.0.0.1:9119"})
	if err != nil {
		t.Fatalf("create external: %v", err)
	}

	if _, err := usecase.EnsureWorkspace(context.Background(), external.Project.ID); err != nil {
		t.Fatalf("ensure workspace: %v", err)
	}
	if workspaces.calls != 1 {
		t.Fatalf("expected one workspace lookup, got %d", workspaces.calls)
	}
	if workspaces.create {
		t.Fatal("vishnu must not create workspaces on a server it does not own")
	}
}

func TestExternalStatusFollowsReachability(t *testing.T) {
	repo := newFakeRepo()
	proc := &fakeProc{}
	usecase := newUsecase(repo, proc, &fakeCloner{}, &fakeWorkspaces{})

	external, err := usecase.Create(context.Background(), dto.CreateProjectRequest{Upstream: "http://127.0.0.1:9119"})
	if err != nil {
		t.Fatalf("create external: %v", err)
	}
	if external.Project.Status != string(process.StatusDown) {
		t.Fatalf("got status %q, want down for an unreachable external server", external.Project.Status)
	}

	proc.status = process.StatusUp
	projects, err := usecase.List(context.Background())
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(projects) != 1 || projects[0].Status != string(process.StatusUp) {
		t.Fatalf("got %+v, want the external server reported up", projects)
	}
}
