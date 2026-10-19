package repository_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"gorm.io/gorm"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/repository"
)

func authDB(t *testing.T) *gorm.DB {
	t.Helper()

	db := testDB(t)
	if err := db.Exec("TRUNCATE users, otp_codes, auth_sessions").Error; err != nil {
		t.Fatalf("truncate auth tables: %v", err)
	}
	return db
}

func TestUserRepositoryUpsertIsIdempotent(t *testing.T) {
	repositories := repository.NewRepositories(authDB(t))
	ctx := context.Background()

	first := &domain.User{Email: "Owner@Example.com", Role: domain.UserRoleAdmin}
	if err := repositories.User.Upsert(ctx, first); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	if first.ID == "" {
		t.Fatal("upsert did not assign an id")
	}

	got, err := repositories.User.GetByEmail(ctx, "owner@example.com")
	if err != nil {
		t.Fatalf("get by email: %v", err)
	}
	if got.ID != first.ID || got.Role != domain.UserRoleAdmin {
		t.Fatalf("unexpected user: %+v", got)
	}

	second := &domain.User{Email: "owner@example.com", Role: domain.UserRoleMember}
	if err := repositories.User.Upsert(ctx, second); err != nil {
		t.Fatalf("second upsert: %v", err)
	}
	if second.ID != first.ID {
		t.Fatalf("upsert created a second row: %s vs %s", second.ID, first.ID)
	}

	got, err = repositories.User.GetByID(ctx, first.ID)
	if err != nil {
		t.Fatalf("get by id: %v", err)
	}
	if got.Role != domain.UserRoleMember {
		t.Fatalf("the role was not updated: %+v", got)
	}

	if _, err := repositories.User.GetByEmail(ctx, "stranger@example.com"); !errors.Is(err, errs.ErrUserNotFound) {
		t.Fatalf("expected ErrUserNotFound, got %v", err)
	}
}

func TestUserRepositoryRejectsMalformedIDs(t *testing.T) {
	repositories := repository.NewRepositories(authDB(t))

	if _, err := repositories.User.GetByID(context.Background(), "not-a-uuid"); !errors.Is(err, errs.ErrUserNotFound) {
		t.Fatalf("expected ErrUserNotFound for a malformed id, got %v", err)
	}
}

func TestOTPRepositoryFlow(t *testing.T) {
	repositories := repository.NewRepositories(authDB(t))
	ctx := context.Background()
	now := time.Now().UTC().Truncate(time.Microsecond)

	code := &domain.OTPCode{
		Email:     "Owner@Example.com",
		CodeHash:  "hash-1",
		ExpiresAt: now.Add(10 * time.Minute),
	}
	if err := repositories.OTP.Create(ctx, code); err != nil {
		t.Fatalf("create: %v", err)
	}

	pending, err := repositories.OTP.LatestPending(ctx, "owner@example.com")
	if err != nil {
		t.Fatalf("latest pending: %v", err)
	}
	if pending.ID != code.ID || pending.CodeHash != "hash-1" || pending.Attempts != 0 {
		t.Fatalf("unexpected code: %+v", pending)
	}

	count, err := repositories.OTP.CountSince(ctx, "owner@example.com", now.Add(-time.Minute))
	if err != nil {
		t.Fatalf("count inside the window: %v", err)
	}
	if count != 1 {
		t.Fatalf("got %d, want 1", count)
	}

	count, err = repositories.OTP.CountSince(ctx, "owner@example.com", now.Add(time.Minute))
	if err != nil {
		t.Fatalf("count outside the window: %v", err)
	}
	if count != 0 {
		t.Fatalf("got %d, want 0 outside the window", count)
	}

	if err := repositories.OTP.IncrementAttempts(ctx, code.ID); err != nil {
		t.Fatalf("increment: %v", err)
	}
	pending, err = repositories.OTP.LatestPending(ctx, "owner@example.com")
	if err != nil {
		t.Fatalf("latest pending after increment: %v", err)
	}
	if pending.Attempts != 1 {
		t.Fatalf("got attempts %d, want 1", pending.Attempts)
	}

	if err := repositories.OTP.Consume(ctx, code.ID, now); err != nil {
		t.Fatalf("consume: %v", err)
	}
	if _, err := repositories.OTP.LatestPending(ctx, "owner@example.com"); !errors.Is(err, errs.ErrOTPNotFound) {
		t.Fatalf("expected ErrOTPNotFound after consuming, got %v", err)
	}
	if err := repositories.OTP.Consume(ctx, code.ID, now.Add(time.Second)); !errors.Is(err, errs.ErrOTPConsumed) {
		t.Fatalf("expected ErrOTPConsumed for a second consume, got %v", err)
	}
}

func TestSessionRepositoryCreateLookupAndSlide(t *testing.T) {
	repositories := repository.NewRepositories(authDB(t))
	ctx := context.Background()

	user := &domain.User{Email: "owner@example.com", Role: domain.UserRoleAdmin}
	if err := repositories.User.Upsert(ctx, user); err != nil {
		t.Fatalf("upsert user: %v", err)
	}

	now := time.Now().UTC().Truncate(time.Microsecond)
	session := &domain.AuthSession{
		UserID:    user.ID,
		TokenHash: "token-hash",
		ExpiresAt: now.Add(time.Hour),
	}
	if err := repositories.Session.Create(ctx, session); err != nil {
		t.Fatalf("create: %v", err)
	}

	stored, err := repositories.Session.GetByTokenHash(ctx, "token-hash")
	if err != nil {
		t.Fatalf("lookup: %v", err)
	}
	if stored.UserID != user.ID {
		t.Fatalf("got user %s, want %s", stored.UserID, user.ID)
	}
	if stored.LastSeenAt != nil {
		t.Fatalf("a fresh session already has last_seen_at: %v", stored.LastSeenAt)
	}

	seen := now.Add(2 * time.Minute)
	expires := now.Add(2 * time.Hour)
	if err := repositories.Session.Touch(ctx, session.ID, seen, expires); err != nil {
		t.Fatalf("touch: %v", err)
	}

	stored, err = repositories.Session.GetByTokenHash(ctx, "token-hash")
	if err != nil {
		t.Fatalf("lookup after touch: %v", err)
	}
	if stored.LastSeenAt == nil || !stored.LastSeenAt.Equal(seen) {
		t.Fatalf("last_seen_at was not recorded: %v", stored.LastSeenAt)
	}
	if !stored.ExpiresAt.Equal(expires) {
		t.Fatalf("the expiry window was not slid: %v", stored.ExpiresAt)
	}

	if _, err := repositories.Session.GetByTokenHash(ctx, "unknown"); !errors.Is(err, errs.ErrSessionNotFound) {
		t.Fatalf("expected ErrSessionNotFound, got %v", err)
	}

	if err := repositories.Session.DeleteByTokenHash(ctx, "token-hash"); err != nil {
		t.Fatalf("delete: %v", err)
	}
	if _, err := repositories.Session.GetByTokenHash(ctx, "token-hash"); !errors.Is(err, errs.ErrSessionNotFound) {
		t.Fatalf("the session survived logout: %v", err)
	}
}
