package usecase

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"math/big"
	"net/mail"
	"strings"
	"time"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/service/email"
)

const (
	otpTTL          = 10 * time.Minute
	otpMaxAttempts  = 5
	otpResendWindow = time.Minute
	sessionTouchGap = time.Minute
)

type Mailer interface {
	SendEmail(ctx context.Context, payload *email.EmailPayload) error
}

type AuthUsecase struct {
	users    domain.UserRepository
	otps     domain.OTPRepository
	sessions domain.SessionRepository
	mailer   Mailer
	ttl      time.Duration

	now  func() time.Time
	code func() (string, error)
}

func NewAuthUsecase(
	users domain.UserRepository,
	otps domain.OTPRepository,
	sessions domain.SessionRepository,
	mailer Mailer,
	ttl time.Duration,
) *AuthUsecase {
	if ttl <= 0 {
		ttl = 720 * time.Hour
	}
	return &AuthUsecase{
		users:    users,
		otps:     otps,
		sessions: sessions,
		mailer:   mailer,
		ttl:      ttl,
		now:      time.Now,
		code:     generateCode,
	}
}

func (u *AuthUsecase) Bootstrap(ctx context.Context, rawEmail, name string) (*domain.User, error) {
	email, err := normalizeEmail(rawEmail)
	if err != nil {
		return nil, err
	}

	user := &domain.User{Email: email, Role: domain.UserRoleAdmin}
	if strings.TrimSpace(name) != "" {
		user.Name = &name
	}
	if err := u.users.Upsert(ctx, user); err != nil {
		return nil, err
	}
	return u.users.GetByEmail(ctx, email)
}

// RequestOTP reports success whether or not the address is registered, and
// stays quiet inside the resend window: the response must not reveal who is
// eligible, and a second code nobody asked for is noise.
func (u *AuthUsecase) RequestOTP(ctx context.Context, rawEmail string) error {
	email, err := normalizeEmail(rawEmail)
	if err != nil {
		return err
	}

	if _, err := u.users.GetByEmail(ctx, email); err != nil {
		if errors.Is(err, errs.ErrUserNotFound) {
			return nil
		}
		return err
	}

	recent, err := u.otps.CountSince(ctx, email, u.now().Add(-otpResendWindow))
	if err != nil {
		return err
	}
	if recent > 0 {
		return nil
	}

	code, err := u.code()
	if err != nil {
		return err
	}

	if err := u.otps.Create(ctx, &domain.OTPCode{
		Email:     email,
		CodeHash:  hashToken(code),
		ExpiresAt: u.now().Add(otpTTL),
	}); err != nil {
		return err
	}

	// A delivery failure is logged rather than reported: the caller learns
	// nothing about the address either way.
	if err := u.mailer.SendEmail(ctx, otpPayload(email, code)); err != nil {
		slog.Error("Failed to deliver a sign-in code", "email", email, "error", err)
	}
	return nil
}

func (u *AuthUsecase) Verify(ctx context.Context, rawEmail, code string) (string, *domain.User, error) {
	email, err := normalizeEmail(rawEmail)
	if err != nil {
		return "", nil, errs.ErrOTPInvalid
	}

	user, err := u.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, errs.ErrUserNotFound) {
			return "", nil, errs.ErrOTPInvalid
		}
		return "", nil, err
	}

	pending, err := u.otps.LatestPending(ctx, email)
	if err != nil {
		if errors.Is(err, errs.ErrOTPNotFound) {
			return "", nil, errs.ErrOTPInvalid
		}
		return "", nil, err
	}

	if pending.Attempts >= otpMaxAttempts {
		return "", nil, errs.ErrOTPAttemptsExhausted
	}
	if u.now().After(pending.ExpiresAt) {
		return "", nil, errs.ErrOTPExpired
	}

	if subtle.ConstantTimeCompare([]byte(hashToken(strings.TrimSpace(code))), []byte(pending.CodeHash)) != 1 {
		if err := u.otps.IncrementAttempts(ctx, pending.ID); err != nil {
			return "", nil, err
		}
		return "", nil, errs.ErrOTPInvalid
	}

	// A code is single-use: consuming it before the session exists means a
	// replayed request cannot mint a second one. A lost race for the same
	// code reports the code as invalid rather than minting a second session.
	if err := u.otps.Consume(ctx, pending.ID, u.now()); err != nil {
		if errors.Is(err, errs.ErrOTPConsumed) {
			return "", nil, errs.ErrOTPInvalid
		}
		return "", nil, err
	}

	token, err := newToken()
	if err != nil {
		return "", nil, err
	}
	if err := u.sessions.Create(ctx, &domain.AuthSession{
		UserID:    user.ID,
		TokenHash: hashToken(token),
		ExpiresAt: u.now().Add(u.ttl),
	}); err != nil {
		return "", nil, err
	}

	return token, user, nil
}

// User resolves a session cookie and slides its expiry window forward, so an
// actively used session does not expire mid-use.
func (u *AuthUsecase) User(ctx context.Context, token string) (*domain.User, error) {
	if token == "" {
		return nil, errs.ErrSessionNotFound
	}

	session, err := u.sessions.GetByTokenHash(ctx, hashToken(token))
	if err != nil {
		return nil, err
	}

	now := u.now()
	if now.After(session.ExpiresAt) {
		return nil, errs.ErrSessionNotFound
	}

	user, err := u.users.GetByID(ctx, session.UserID)
	if err != nil {
		return nil, err
	}

	if session.LastSeenAt == nil || now.Sub(*session.LastSeenAt) >= sessionTouchGap {
		if err := u.sessions.Touch(ctx, session.ID, now, now.Add(u.ttl)); err != nil {
			slog.Warn("Failed to slide the session window", "session", session.ID, "error", err)
		}
	}

	return user, nil
}

func (u *AuthUsecase) Logout(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	if err := u.sessions.DeleteByTokenHash(ctx, hashToken(token)); err != nil && !errors.Is(err, errs.ErrSessionNotFound) {
		return err
	}
	return nil
}

func (u *AuthUsecase) TTL() time.Duration {
	return u.ttl
}

func otpPayload(to, code string) *email.EmailPayload {
	return &email.EmailPayload{
		To:          to,
		Subject:     "Your vishnu code",
		Body:        "Your vishnu sign-in code is " + code + ". It expires in 10 minutes.",
		HTMLContent: "<p>Your vishnu sign-in code is <strong>" + code + "</strong>.</p><p>It expires in 10 minutes.</p>",
		Categories:  []string{"auth"},
	}
}

func normalizeEmail(raw string) (string, error) {
	email := strings.ToLower(strings.TrimSpace(raw))
	if email == "" {
		return "", errs.ErrInvalidEmail
	}
	if _, err := mail.ParseAddress(email); err != nil {
		return "", errs.ErrInvalidEmail
	}
	return email, nil
}

func generateCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

func newToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}
