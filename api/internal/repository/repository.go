package repository

import (
	"gorm.io/gorm"

	"github.com/andikapradanaarif/vishnu/internal/domain"
)

type Repositories struct {
	Project domain.ProjectRepository
	User    domain.UserRepository
	OTP     domain.OTPRepository
	Session domain.SessionRepository
}

func NewRepositories(db *gorm.DB) *Repositories {
	return &Repositories{
		Project: NewProjectRepository(db),
		User:    NewUserRepository(db),
		OTP:     NewOTPRepository(db),
		Session: NewSessionRepository(db),
	}
}
