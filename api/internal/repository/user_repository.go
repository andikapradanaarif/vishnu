package repository

import (
	"context"
	"errors"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
)

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	if !isUUID(id) {
		return nil, errs.ErrUserNotFound
	}

	var user domain.User
	if err := r.db.WithContext(ctx).First(&user, "id = ?", id).Error; err != nil {
		return nil, mapUserError(err)
	}
	return &user, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	var user domain.User
	if err := r.db.WithContext(ctx).First(&user, "email = ?", normalizeEmail(email)).Error; err != nil {
		return nil, mapUserError(err)
	}
	return &user, nil
}

func (r *userRepository) Upsert(ctx context.Context, user *domain.User) error {
	existing, err := r.GetByEmail(ctx, user.Email)
	if err != nil {
		if !errors.Is(err, errs.ErrUserNotFound) {
			return err
		}
		if user.ID == "" {
			user.ID = uuid.NewString()
		}
		if user.Role == "" {
			user.Role = domain.UserRoleMember
		}
		return mapUserError(r.db.WithContext(ctx).Create(user).Error)
	}

	user.ID = existing.ID
	if user.Name == nil {
		user.Name = existing.Name
	}

	return mapUserError(r.db.WithContext(ctx).Model(&domain.User{}).
		Where("id = ?", existing.ID).
		Updates(map[string]any{"name": user.Name, "role": user.Role}).Error)
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func mapUserError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return errs.ErrUserNotFound
	}
	return err
}
