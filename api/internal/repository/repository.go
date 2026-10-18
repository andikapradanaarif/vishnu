package repository

import (
	"gorm.io/gorm"

	"github.com/andikapradanaarif/vishnu/internal/domain"
)

type Repositories struct {
	Project domain.ProjectRepository
}

func NewRepositories(db *gorm.DB) *Repositories {
	return &Repositories{
		Project: NewProjectRepository(db),
	}
}
