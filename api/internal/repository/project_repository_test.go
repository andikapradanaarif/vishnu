package repository_test

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/migrator"
	"github.com/andikapradanaarif/vishnu/internal/repository"
)

func testDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := os.Getenv("VISHNU_TEST_DB_DSN")
	if dsn == "" {
		t.Skip("set VISHNU_TEST_DB_DSN to a Postgres DSN to run repository tests")
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{SkipDefaultTransaction: true})
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}

	runner := migrator.New(db)
	if err := runner.EnsureTable(); err != nil {
		t.Fatalf("ensure migrations table: %v", err)
	}
	if err := runner.Up(); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}
	if err := db.Exec("TRUNCATE projects").Error; err != nil {
		t.Fatalf("truncate projects: %v", err)
	}

	return db
}

func ptr[T any](v T) *T {
	return &v
}

func managed(name, path string) *domain.Project {
	return &domain.Project{
		Name:   name,
		Path:   ptr(path),
		Mode:   domain.ProjectModeManaged,
		Port:   ptr(9201),
		Status: domain.ProjectStatusReady,
	}
}

func TestCreateAndGet(t *testing.T) {
	repo := repository.NewProjectRepository(testDB(t))
	ctx := context.Background()

	project := managed("vishnu", "/tmp/vishnu")
	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("create: %v", err)
	}
	if project.ID == "" {
		t.Fatal("create did not assign an id")
	}

	got, err := repo.GetByID(ctx, project.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != "vishnu" || got.Path == nil || *got.Path != "/tmp/vishnu" {
		t.Fatalf("unexpected project: %+v", got)
	}
	if got.Status != domain.ProjectStatusReady || got.Mode != domain.ProjectModeManaged {
		t.Fatalf("unexpected status/mode: %+v", got)
	}

	if _, err := repo.GetByID(ctx, "6f1a4a4e-0000-0000-0000-000000000000"); !errors.Is(err, errs.ErrProjectNotFound) {
		t.Fatalf("expected ErrProjectNotFound, got %v", err)
	}
}

func TestCreateConflictPerUniqueColumn(t *testing.T) {
	db := testDB(t)
	repo := repository.NewProjectRepository(db)
	ctx := context.Background()

	first := managed("first", "/tmp/first")
	first.RepoURL = ptr("github.com/owner/repo")
	first.Upstream = ptr("http://127.0.0.1:9201")
	if err := repo.Create(ctx, first); err != nil {
		t.Fatalf("create first: %v", err)
	}

	dupPath := managed("dup-path", "/tmp/first")
	if err := repo.Create(ctx, dupPath); !errors.Is(err, errs.ErrProjectConflict) {
		t.Fatalf("expected conflict on path, got %v", err)
	}

	dupRepo := managed("dup-repo", "/tmp/dup-repo")
	dupRepo.RepoURL = ptr("github.com/owner/repo")
	if err := repo.Create(ctx, dupRepo); !errors.Is(err, errs.ErrProjectConflict) {
		t.Fatalf("expected conflict on repo_url, got %v", err)
	}

	dupUpstream := managed("dup-upstream", "/tmp/dup-upstream")
	dupUpstream.Upstream = ptr("http://127.0.0.1:9201")
	if err := repo.Create(ctx, dupUpstream); !errors.Is(err, errs.ErrProjectConflict) {
		t.Fatalf("expected conflict on upstream, got %v", err)
	}
}

func TestSetStatus(t *testing.T) {
	repo := repository.NewProjectRepository(testDB(t))
	ctx := context.Background()

	project := managed("vishnu", "/tmp/vishnu")
	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("create: %v", err)
	}

	if err := repo.SetStatus(ctx, project.ID, domain.ProjectStatusError, "clone failed"); err != nil {
		t.Fatalf("set status: %v", err)
	}

	got, err := repo.GetByID(ctx, project.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Status != domain.ProjectStatusError || got.Error == nil || *got.Error != "clone failed" {
		t.Fatalf("unexpected status/error: %+v", got)
	}

	if err := repo.SetStatus(ctx, project.ID, domain.ProjectStatusReady, ""); err != nil {
		t.Fatalf("set status back: %v", err)
	}
	got, err = repo.GetByID(ctx, project.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Error != nil {
		t.Fatalf("expected cleared error, got %v", *got.Error)
	}

	if err := repo.SetStatus(ctx, "6f1a4a4e-0000-0000-0000-000000000000", domain.ProjectStatusReady, ""); !errors.Is(err, errs.ErrProjectNotFound) {
		t.Fatalf("expected ErrProjectNotFound, got %v", err)
	}
}

func TestSoftDeleteHidesRowAndFreesUniqueIndex(t *testing.T) {
	repo := repository.NewProjectRepository(testDB(t))
	ctx := context.Background()

	project := managed("vishnu", "/tmp/vishnu")
	if err := repo.Create(ctx, project); err != nil {
		t.Fatalf("create: %v", err)
	}

	if err := repo.SoftDelete(ctx, project.ID); err != nil {
		t.Fatalf("soft delete: %v", err)
	}

	list, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 0 {
		t.Fatalf("expected soft-deleted row hidden, got %d rows", len(list))
	}
	if _, err := repo.GetByID(ctx, project.ID); !errors.Is(err, errs.ErrProjectNotFound) {
		t.Fatalf("expected ErrProjectNotFound after delete, got %v", err)
	}

	if err := repo.Create(ctx, managed("vishnu-again", "/tmp/vishnu")); err != nil {
		t.Fatalf("expected the unique index to be free after soft delete, got %v", err)
	}

	if err := repo.SoftDelete(ctx, "6f1a4a4e-0000-0000-0000-000000000000"); !errors.Is(err, errs.ErrProjectNotFound) {
		t.Fatalf("expected ErrProjectNotFound, got %v", err)
	}
}

func TestUpdatePersistsAndRespectsUniqueIndex(t *testing.T) {
	repo := repository.NewProjectRepository(testDB(t))
	ctx := context.Background()

	first := managed("first", "/tmp/first")
	second := managed("second", "/tmp/second")
	for _, p := range []*domain.Project{first, second} {
		if err := repo.Create(ctx, p); err != nil {
			t.Fatalf("create %s: %v", p.Name, err)
		}
	}

	second.Name = "second-renamed"
	if err := repo.Update(ctx, second); err != nil {
		t.Fatalf("update: %v", err)
	}
	got, err := repo.GetByID(ctx, second.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != "second-renamed" {
		t.Fatalf("update did not persist: %+v", got)
	}

	second.Path = ptr("/tmp/first")
	if err := repo.Update(ctx, second); !errors.Is(err, errs.ErrProjectConflict) {
		t.Fatalf("expected conflict when moving onto a taken path, got %v", err)
	}
}

func TestListOrdersByCreatedAt(t *testing.T) {
	repo := repository.NewProjectRepository(testDB(t))
	ctx := context.Background()

	now := time.Now().UTC().Truncate(time.Millisecond)
	for i, name := range []string{"oldest", "middle", "newest"} {
		project := managed(name, "/tmp/"+name)
		project.CreatedAt = now.Add(time.Duration(i-2) * time.Minute)
		project.UpdatedAt = project.CreatedAt
		if err := repo.Create(ctx, project); err != nil {
			t.Fatalf("create %s: %v", name, err)
		}
	}

	list, err := repo.List(ctx)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(list) != 3 {
		t.Fatalf("expected 3 rows, got %d", len(list))
	}
	for i, want := range []string{"oldest", "middle", "newest"} {
		if list[i].Name != want {
			t.Fatalf("position %d: expected %s, got %s", i, want, list[i].Name)
		}
	}
}
