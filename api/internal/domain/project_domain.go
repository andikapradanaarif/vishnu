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
	ID       string        `gorm:"type:uuid;primaryKey"`
	Name     string        `gorm:"type:text;not null"`
	Path     *string       `gorm:"type:text"`
	Mode     ProjectMode   `gorm:"type:text;not null"`
	Port     *int          `gorm:"type:integer"`
	RepoURL  *string       `gorm:"type:text"`
	Upstream *string       `gorm:"type:text"`
	Status   ProjectStatus `gorm:"type:text;not null"`
	Error    *string       `gorm:"type:text"`
	// PermissionSkip is the project's workspace-level auto-approve
	// default. It lives here and not only in the crush child because
	// that child recycles when its last client detaches (a closed tab),
	// and the flag it keeps in memory would die with it.
	PermissionSkip bool `gorm:"type:boolean;not null;default:false"`
	// Agent is the project's main agent (coder/plan/task). Crush keeps
	// its main agent in coordinator memory only and resets it to the
	// coder default whenever the child starts, so the choice has to be
	// stored here and replayed like the auto-approve default.
	Agent     string         `gorm:"type:text;not null;default:coder"`
	CreatedAt time.Time      `gorm:"type:timestamptz;not null;default:now()"`
	UpdatedAt time.Time      `gorm:"type:timestamptz;not null;default:now()"`
	DeletedAt gorm.DeletedAt `gorm:"type:timestamptz"`
}

// ProjectDefaultAgent mirrors crush's config.AgentCoder — the agent a
// fresh coordinator starts on. A project sitting on it needs no replay.
const ProjectDefaultAgent = "coder"

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
	SetPermissionSkip(ctx context.Context, id string, skip bool) error
	SetAgent(ctx context.Context, id string, agent string) error
}
