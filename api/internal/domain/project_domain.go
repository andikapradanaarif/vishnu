package domain

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type ProjectMode string

const (
	ProjectModeManaged  ProjectMode = "managed"
	ProjectModeExternal ProjectMode = "external"
)

type ProjectStatus string

const (
	ProjectStatusCloning ProjectStatus = "cloning"
	ProjectStatusReady   ProjectStatus = "ready"
	ProjectStatusError   ProjectStatus = "error"
)

type Project struct {
	ID        string         `gorm:"type:uuid;primaryKey"`
	Name      string         `gorm:"type:text;not null"`
	Path      *string        `gorm:"type:text"`
	Mode      ProjectMode    `gorm:"type:text;not null"`
	Port      *int           `gorm:"type:integer"`
	RepoURL   *string        `gorm:"type:text"`
	Upstream  *string        `gorm:"type:text"`
	Status    ProjectStatus  `gorm:"type:text;not null"`
	Error     *string        `gorm:"type:text"`
	CreatedAt time.Time      `gorm:"type:timestamptz;not null;default:now()"`
	UpdatedAt time.Time      `gorm:"type:timestamptz;not null;default:now()"`
	DeletedAt gorm.DeletedAt `gorm:"type:timestamptz"`
}

func (Project) TableName() string {
	return "projects"
}

type ProjectRepository interface {
	List(ctx context.Context) ([]Project, error)
	GetByID(ctx context.Context, id string) (*Project, error)
	Create(ctx context.Context, project *Project) error
	Update(ctx context.Context, project *Project) error
	SoftDelete(ctx context.Context, id string) error
	SetStatus(ctx context.Context, id string, status ProjectStatus, errMsg string) error
}
