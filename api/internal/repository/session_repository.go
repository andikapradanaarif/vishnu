package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
)

type sessionRepository struct {
	db *gorm.DB
}

func NewSessionRepository(db *gorm.DB) domain.SessionRepository {
	return &sessionRepository{db: db}
}

func (r *sessionRepository) Create(ctx context.Context, session *domain.AuthSession) error {
	if session.ID == "" {
		session.ID = uuid.NewString()
	}
	return r.db.WithContext(ctx).Create(session).Error
}

func (r *sessionRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*domain.AuthSession, error) {
	var session domain.AuthSession
	if err := r.db.WithContext(ctx).First(&session, "token_hash = ?", tokenHash).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrSessionNotFound
		}
		return nil, err
	}
	return &session, nil
}

func (r *sessionRepository) Touch(ctx context.Context, id string, seenAt, expiresAt time.Time) error {
	return r.db.WithContext(ctx).Model(&domain.AuthSession{}).
		Where("id = ?", id).
		Updates(map[string]any{"last_seen_at": seenAt, "expires_at": expiresAt}).Error
}

func (r *sessionRepository) DeleteByTokenHash(ctx context.Context, tokenHash string) error {
	return r.db.WithContext(ctx).
		Where("token_hash = ?", tokenHash).
		Delete(&domain.AuthSession{}).Error
}
