package domain

import (
	"context"
	"time"

	"gorm.io/gorm"
)

type UserRole string

const (
	UserRoleAdmin  UserRole = "admin"
	UserRoleMember UserRole = "member"
)

type User struct {
	ID        string         `gorm:"type:uuid;primaryKey"`
	Email     string         `gorm:"type:citext;not null"`
	Name      *string        `gorm:"type:text"`
	Role      UserRole       `gorm:"type:text;not null;default:member"`
	CreatedAt time.Time      `gorm:"type:timestamptz;not null;default:now()"`
	UpdatedAt time.Time      `gorm:"type:timestamptz;not null;default:now()"`
	DeletedAt gorm.DeletedAt `gorm:"type:timestamptz"`
}

func (User) TableName() string {
	return "users"
}

type OTPCode struct {
	ID         string     `gorm:"type:uuid;primaryKey"`
	Email      string     `gorm:"type:citext;not null"`
	CodeHash   string     `gorm:"type:text;not null"`
	Attempts   int        `gorm:"not null;default:0"`
	ExpiresAt  time.Time  `gorm:"type:timestamptz;not null"`
	ConsumedAt *time.Time `gorm:"type:timestamptz"`
	CreatedAt  time.Time  `gorm:"type:timestamptz;not null;default:now()"`
}

func (OTPCode) TableName() string {
	return "otp_codes"
}

type AuthSession struct {
	ID         string     `gorm:"type:uuid;primaryKey"`
	UserID     string     `gorm:"type:uuid;not null"`
	TokenHash  string     `gorm:"type:text;not null"`
	ExpiresAt  time.Time  `gorm:"type:timestamptz;not null"`
	LastSeenAt *time.Time `gorm:"type:timestamptz"`
	CreatedAt  time.Time  `gorm:"type:timestamptz;not null;default:now()"`
}

func (AuthSession) TableName() string {
	return "auth_sessions"
}

type UserRepository interface {
	GetByID(ctx context.Context, id string) (*User, error)
	GetByEmail(ctx context.Context, email string) (*User, error)
	Upsert(ctx context.Context, user *User) error
}

type OTPRepository interface {
	Create(ctx context.Context, code *OTPCode) error
	LatestPending(ctx context.Context, email string) (*OTPCode, error)
	CountSince(ctx context.Context, email string, since time.Time) (int, error)
	IncrementAttempts(ctx context.Context, id string) error
	Consume(ctx context.Context, id string, at time.Time) error
}

type SessionRepository interface {
	Create(ctx context.Context, session *AuthSession) error
	GetByTokenHash(ctx context.Context, tokenHash string) (*AuthSession, error)
	// Touch records activity and slides the expiry window forward.
	Touch(ctx context.Context, id string, seenAt, expiresAt time.Time) error
	DeleteByTokenHash(ctx context.Context, tokenHash string) error
}
