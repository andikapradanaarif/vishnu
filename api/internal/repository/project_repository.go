package repository

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
)

type projectRepository struct {
	db *gorm.DB
}

func NewProjectRepository(db *gorm.DB) domain.ProjectRepository {
	return &projectRepository{db: db}
}

func (r *projectRepository) List(ctx context.Context) ([]domain.Project, error) {
	var projects []domain.Project
	if err := r.db.WithContext(ctx).Order("created_at ASC").Find(&projects).Error; err != nil {
		return nil, err
	}
	return projects, nil
}

func (r *projectRepository) GetByID(ctx context.Context, id string) (*domain.Project, error) {
	if !isUUID(id) {
		return nil, errs.ErrProjectNotFound
	}

	var project domain.Project
	if err := r.db.WithContext(ctx).First(&project, "id = ?", id).Error; err != nil {
		return nil, mapError(err)
	}
	return &project, nil
}

func (r *projectRepository) Create(ctx context.Context, project *domain.Project) error {
	if project.ID == "" {
		project.ID = uuid.NewString()
	}
	return mapError(r.db.WithContext(ctx).Create(project).Error)
}

func (r *projectRepository) Update(ctx context.Context, project *domain.Project) error {
	return mapError(r.db.WithContext(ctx).Save(project).Error)
}

func (r *projectRepository) SoftDelete(ctx context.Context, id string) error {
	if !isUUID(id) {
		return errs.ErrProjectNotFound
	}

	result := r.db.WithContext(ctx).Delete(&domain.Project{}, "id = ?", id)
	if result.Error != nil {
		return mapError(result.Error)
	}
	if result.RowsAffected == 0 {
		return errs.ErrProjectNotFound
	}
	return nil
}

func (r *projectRepository) SetStatus(ctx context.Context, id string, status domain.ProjectStatus, errMsg string) error {
	if !isUUID(id) {
		return errs.ErrProjectNotFound
	}

	var message *string
	if errMsg != "" {
		message = &errMsg
	}

	result := r.db.WithContext(ctx).Model(&domain.Project{}).
		Where("id = ?", id).
		Updates(map[string]any{"status": status, "error": message})
	if result.Error != nil {
		return mapError(result.Error)
	}
	if result.RowsAffected == 0 {
		return errs.ErrProjectNotFound
	}
	return nil
}

func (r *projectRepository) SetPermissionSkip(ctx context.Context, id string, skip bool) error {
	if !isUUID(id) {
		return errs.ErrProjectNotFound
	}

	result := r.db.WithContext(ctx).Model(&domain.Project{}).
		Where("id = ?", id).
		Update("permission_skip", skip)
	if result.Error != nil {
		return mapError(result.Error)
	}
	if result.RowsAffected == 0 {
		return errs.ErrProjectNotFound
	}
	return nil
}

func (r *projectRepository) SetAgent(ctx context.Context, id string, agent string) error {
	if !isUUID(id) {
		return errs.ErrProjectNotFound
	}

	result := r.db.WithContext(ctx).Model(&domain.Project{}).
		Where("id = ?", id).
		Update("agent", agent)
	if result.Error != nil {
		return mapError(result.Error)
	}
	if result.RowsAffected == 0 {
		return errs.ErrProjectNotFound
	}
	return nil
}

// isUUID guards id lookups: Postgres rejects a malformed uuid with a type
// error rather than returning no rows, which turns an unknown id into a
// 500 instead of a 404.
func isUUID(id string) bool {
	_, err := uuid.Parse(id)
	return err == nil
}

func mapError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errs.ErrProjectNotFound
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		// A port clash is retryable — the caller picks another port — while
		// a path/repo/upstream clash is a genuine conflict for the user.
		if pgErr.ConstraintName == "projects_port_unique" {
			return errs.ErrPortConflict
		}
		return errs.ErrProjectConflict
	}
	return err
}
