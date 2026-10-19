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

type otpRepository struct {
	db *gorm.DB
}

func NewOTPRepository(db *gorm.DB) domain.OTPRepository {
	return &otpRepository{db: db}
}

func (r *otpRepository) Create(ctx context.Context, code *domain.OTPCode) error {
	if code.ID == "" {
		code.ID = uuid.NewString()
	}
	code.Email = normalizeEmail(code.Email)
	return r.db.WithContext(ctx).Create(code).Error
}

func (r *otpRepository) LatestPending(ctx context.Context, email string) (*domain.OTPCode, error) {
	var code domain.OTPCode
	err := r.db.WithContext(ctx).
		Where("email = ? AND consumed_at IS NULL", normalizeEmail(email)).
		Order("created_at DESC").
		First(&code).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errs.ErrOTPNotFound
		}
		return nil, err
	}
	return &code, nil
}

func (r *otpRepository) CountSince(ctx context.Context, email string, since time.Time) (int, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&domain.OTPCode{}).
		Where("email = ? AND created_at >= ?", normalizeEmail(email), since).
		Count(&count).Error
	return int(count), err
}

func (r *otpRepository) IncrementAttempts(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Model(&domain.OTPCode{}).
		Where("id = ?", id).
		UpdateColumn("attempts", gorm.Expr("attempts + 1")).Error
}

// Consume marks a pending code as used and reports whether this call was the
// one that did it. The `consumed_at IS NULL` predicate makes a second update a
// no-op, which still updates zero rows — so the affected-row count is what
// tells two racing Verifies apart. Without it both could compare the code,
// both see the update "succeed", and both mint a session.
func (r *otpRepository) Consume(ctx context.Context, id string, at time.Time) error {
	result := r.db.WithContext(ctx).Model(&domain.OTPCode{}).
		Where("id = ? AND consumed_at IS NULL", id).
		UpdateColumn("consumed_at", at)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errs.ErrOTPConsumed
	}
	return nil
}
