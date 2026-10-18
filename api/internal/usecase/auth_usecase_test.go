package usecase

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/service/email"
)

type fakeUsers struct {
	byEmail map[string]*domain.User
}

func newFakeUsers() *fakeUsers {
	return &fakeUsers{byEmail: map[string]*domain.User{}}
}

func (f *fakeUsers) add(email string) *domain.User {
	user := &domain.User{ID: uuid.NewString(), Email: email, Role: domain.UserRoleMember}
	f.byEmail[email] = user
	return user
}

func (f *fakeUsers) GetByID(_ context.Context, id string) (*domain.User, error) {
	for _, user := range f.byEmail {
		if user.ID == id {
			return user, nil
		}
	}
	return nil, errs.ErrUserNotFound
}

func (f *fakeUsers) GetByEmail(_ context.Context, email string) (*domain.User, error) {
	user, ok := f.byEmail[strings.ToLower(strings.TrimSpace(email))]
	if !ok {
		return nil, errs.ErrUserNotFound
	}
	return user, nil
}

func (f *fakeUsers) Upsert(_ context.Context, user *domain.User) error {
	existing, ok := f.byEmail[user.Email]
	if ok {
		user.ID = existing.ID
		existing.Role = user.Role
		return nil
	}
	if user.ID == "" {
		user.ID = uuid.NewString()
	}
	copy := *user
	f.byEmail[user.Email] = &copy
	return nil
}

type fakeOTPs struct {
	codes []*domain.OTPCode
	// now mirrors the database's created_at default, so the fake and the
	// usecase agree on when a code was issued.
	now func() time.Time
}

func (f *fakeOTPs) Create(_ context.Context, code *domain.OTPCode) error {
	if code.ID == "" {
		code.ID = uuid.NewString()
	}
	if code.CreatedAt.IsZero() {
		if f.now != nil {
			code.CreatedAt = f.now()
		} else {
			code.CreatedAt = time.Now()
		}
	}
	copy := *code
	f.codes = append(f.codes, &copy)
	return nil
}

func (f *fakeOTPs) LatestPending(_ context.Context, email string) (*domain.OTPCode, error) {
	var latest *domain.OTPCode
	for _, code := range f.codes {
		if code.Email != email || code.ConsumedAt != nil {
			continue
		}
		if latest == nil || code.CreatedAt.After(latest.CreatedAt) {
			latest = code
		}
	}
	if latest == nil {
		return nil, errs.ErrOTPNotFound
	}
	return latest, nil
}

func (f *fakeOTPs) CountSince(_ context.Context, email string, since time.Time) (int, error) {
	count := 0
	for _, code := range f.codes {
		if code.Email == email && !code.CreatedAt.Before(since) {
			count++
		}
	}
	return count, nil
}

func (f *fakeOTPs) IncrementAttempts(_ context.Context, id string) error {
	for _, code := range f.codes {
		if code.ID == id {
			code.Attempts++
		}
	}
	return nil
}

func (f *fakeOTPs) Consume(_ context.Context, id string, at time.Time) error {
	for _, code := range f.codes {
		if code.ID == id {
			consumed := at
			code.ConsumedAt = &consumed
		}
	}
	return nil
}

type fakeSessions struct {
	byHash  map[string]*domain.AuthSession
	touched []string
}

func newFakeSessions() *fakeSessions {
	return &fakeSessions{byHash: map[string]*domain.AuthSession{}}
}

func (f *fakeSessions) Create(_ context.Context, session *domain.AuthSession) error {
	if session.ID == "" {
		session.ID = uuid.NewString()
	}
	copy := *session
	f.byHash[session.TokenHash] = &copy
	return nil
}

func (f *fakeSessions) GetByTokenHash(_ context.Context, tokenHash string) (*domain.AuthSession, error) {
	session, ok := f.byHash[tokenHash]
	if !ok {
		return nil, errs.ErrSessionNotFound
	}
	return session, nil
}

func (f *fakeSessions) Touch(_ context.Context, id string, seenAt, expiresAt time.Time) error {
	for _, session := range f.byHash {
		if session.ID == id {
			seen := seenAt
			session.LastSeenAt = &seen
			session.ExpiresAt = expiresAt
			f.touched = append(f.touched, id)
		}
	}
	return nil
}

func (f *fakeSessions) DeleteByTokenHash(_ context.Context, tokenHash string) error {
	delete(f.byHash, tokenHash)
	return nil
}

type fakeMailer struct {
	sent []*email.EmailPayload
}

func (f *fakeMailer) SendEmail(_ context.Context, payload *email.EmailPayload) error {
	f.sent = append(f.sent, payload)
	return nil
}

type authFixture struct {
	usecase *AuthUsecase
	users   *fakeUsers
	otps    *fakeOTPs
	mails   *fakeMailer
	session *fakeSessions
	now     time.Time
}

func newAuthFixture(t *testing.T) *authFixture {
	t.Helper()

	fixture := &authFixture{
		users:   newFakeUsers(),
		mails:   &fakeMailer{},
		session: newFakeSessions(),
		now:     time.Date(2026, 10, 18, 12, 0, 0, 0, time.UTC),
	}
	fixture.otps = &fakeOTPs{now: func() time.Time { return fixture.now }}

	fixture.usecase = NewAuthUsecase(fixture.users, fixture.otps, fixture.session, fixture.mails, time.Hour)
	fixture.usecase.now = func() time.Time { return fixture.now }
	fixture.usecase.code = func() (string, error) { return "123456", nil }

	return fixture
}

func TestRequestOTPSendsACodeToRegisteredUsers(t *testing.T) {
	fixture := newAuthFixture(t)
	fixture.users.add("owner@example.com")

	if err := fixture.usecase.RequestOTP(context.Background(), "Owner@Example.com"); err != nil {
		t.Fatalf("request otp: %v", err)
	}

	if len(fixture.mails.sent) != 1 {
		t.Fatalf("expected one email, got %d", len(fixture.mails.sent))
	}
	if fixture.mails.sent[0].To != "owner@example.com" {
		t.Fatalf("got recipient %q, want the normalized address", fixture.mails.sent[0].To)
	}
	if len(fixture.otps.codes) != 1 {
		t.Fatalf("expected one stored code, got %d", len(fixture.otps.codes))
	}

	stored := fixture.otps.codes[0]
	if stored.CodeHash == "123456" {
		t.Fatal("the code was stored in plaintext")
	}
	if stored.CodeHash != hashToken("123456") {
		t.Fatalf("stored hash %q does not match the issued code", stored.CodeHash)
	}
	if !stored.ExpiresAt.Equal(fixture.now.Add(otpTTL)) {
		t.Fatalf("got expiry %s, want %s", stored.ExpiresAt, fixture.now.Add(otpTTL))
	}
}

func TestRequestOTPStaysSilentForUnknownAddresses(t *testing.T) {
	fixture := newAuthFixture(t)

	if err := fixture.usecase.RequestOTP(context.Background(), "stranger@example.com"); err != nil {
		t.Fatalf("an unknown address must not produce an error: %v", err)
	}
	if len(fixture.mails.sent) != 0 {
		t.Fatal("an unknown address must not receive mail")
	}
	if len(fixture.otps.codes) != 0 {
		t.Fatal("an unknown address must not leave a code behind")
	}
}

func TestRequestOTPRespectsTheResendWindow(t *testing.T) {
	fixture := newAuthFixture(t)
	fixture.users.add("owner@example.com")

	if err := fixture.usecase.RequestOTP(context.Background(), "owner@example.com"); err != nil {
		t.Fatalf("first request: %v", err)
	}

	fixture.now = fixture.now.Add(30 * time.Second)
	if err := fixture.usecase.RequestOTP(context.Background(), "owner@example.com"); err != nil {
		t.Fatalf("second request inside the window: %v", err)
	}
	if len(fixture.otps.codes) != 1 {
		t.Fatalf("expected the second request to be skipped, got %d codes", len(fixture.otps.codes))
	}

	fixture.now = fixture.now.Add(2 * time.Minute)
	if err := fixture.usecase.RequestOTP(context.Background(), "owner@example.com"); err != nil {
		t.Fatalf("third request after the window: %v", err)
	}
	if len(fixture.otps.codes) != 2 {
		t.Fatalf("expected a new code after the window, got %d", len(fixture.otps.codes))
	}
}

func TestRequestOTPRejectsMalformedAddresses(t *testing.T) {
	fixture := newAuthFixture(t)

	for _, address := range []string{"", "   ", "not-an-address", "@example.com"} {
		if err := fixture.usecase.RequestOTP(context.Background(), address); !errors.Is(err, errs.ErrInvalidEmail) {
			t.Fatalf("expected %q to be rejected, got %v", address, err)
		}
	}
}

func TestVerifyIssuesASessionAndConsumesTheCode(t *testing.T) {
	fixture := newAuthFixture(t)
	user := fixture.users.add("owner@example.com")

	if err := fixture.usecase.RequestOTP(context.Background(), "owner@example.com"); err != nil {
		t.Fatalf("request otp: %v", err)
	}

	token, verified, err := fixture.usecase.Verify(context.Background(), "owner@example.com", "123456")
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if verified.ID != user.ID {
		t.Fatalf("got user %s, want %s", verified.ID, user.ID)
	}
	if token == "" {
		t.Fatal("verify did not return a session token")
	}

	session, ok := fixture.session.byHash[hashToken(token)]
	if !ok {
		t.Fatal("no session was created for the token")
	}
	if session.UserID != user.ID || !session.ExpiresAt.Equal(fixture.now.Add(time.Hour)) {
		t.Fatalf("unexpected session: %+v", session)
	}
	if fixture.otps.codes[0].ConsumedAt == nil {
		t.Fatal("the code was not consumed")
	}

	if _, _, err := fixture.usecase.Verify(context.Background(), "owner@example.com", "123456"); !errors.Is(err, errs.ErrOTPInvalid) {
		t.Fatalf("a consumed code must not work twice, got %v", err)
	}
}

func TestVerifyCountsFailedAttemptsAndLocks(t *testing.T) {
	fixture := newAuthFixture(t)
	fixture.users.add("owner@example.com")

	if err := fixture.usecase.RequestOTP(context.Background(), "owner@example.com"); err != nil {
		t.Fatalf("request otp: %v", err)
	}

	for attempt := 1; attempt <= otpMaxAttempts; attempt++ {
		if _, _, err := fixture.usecase.Verify(context.Background(), "owner@example.com", "000000"); !errors.Is(err, errs.ErrOTPInvalid) {
			t.Fatalf("attempt %d: expected ErrOTPInvalid, got %v", attempt, err)
		}
		if fixture.otps.codes[0].Attempts != attempt {
			t.Fatalf("attempt %d: counter is %d", attempt, fixture.otps.codes[0].Attempts)
		}
	}

	if _, _, err := fixture.usecase.Verify(context.Background(), "owner@example.com", "000000"); !errors.Is(err, errs.ErrOTPAttemptsExhausted) {
		t.Fatalf("expected the code to be locked, got %v", err)
	}
	if _, _, err := fixture.usecase.Verify(context.Background(), "owner@example.com", "123456"); !errors.Is(err, errs.ErrOTPAttemptsExhausted) {
		t.Fatalf("a locked code must reject the correct value too, got %v", err)
	}
}

func TestVerifyRejectsExpiredCodes(t *testing.T) {
	fixture := newAuthFixture(t)
	fixture.users.add("owner@example.com")

	if err := fixture.usecase.RequestOTP(context.Background(), "owner@example.com"); err != nil {
		t.Fatalf("request otp: %v", err)
	}

	fixture.now = fixture.now.Add(otpTTL + time.Second)
	if _, _, err := fixture.usecase.Verify(context.Background(), "owner@example.com", "123456"); !errors.Is(err, errs.ErrOTPExpired) {
		t.Fatalf("expected ErrOTPExpired, got %v", err)
	}
}

func TestVerifyRejectsUnknownAddressesAndMissingCodes(t *testing.T) {
	fixture := newAuthFixture(t)

	if _, _, err := fixture.usecase.Verify(context.Background(), "stranger@example.com", "123456"); !errors.Is(err, errs.ErrOTPInvalid) {
		t.Fatalf("expected ErrOTPInvalid for an unknown address, got %v", err)
	}

	fixture.users.add("owner@example.com")
	if _, _, err := fixture.usecase.Verify(context.Background(), "owner@example.com", "123456"); !errors.Is(err, errs.ErrOTPInvalid) {
		t.Fatalf("expected ErrOTPInvalid when no code was requested, got %v", err)
	}
}

func TestUserResolvesSlidesAndExpiresSessions(t *testing.T) {
	fixture := newAuthFixture(t)
	user := fixture.users.add("owner@example.com")

	if err := fixture.usecase.RequestOTP(context.Background(), "owner@example.com"); err != nil {
		t.Fatalf("request otp: %v", err)
	}
	token, _, err := fixture.usecase.Verify(context.Background(), "owner@example.com", "123456")
	if err != nil {
		t.Fatalf("verify: %v", err)
	}

	resolved, err := fixture.usecase.User(context.Background(), token)
	if err != nil {
		t.Fatalf("resolve: %v", err)
	}
	if resolved.ID != user.ID {
		t.Fatalf("got user %s, want %s", resolved.ID, user.ID)
	}
	if len(fixture.session.touched) != 1 {
		t.Fatalf("expected the session to be touched once, got %d", len(fixture.session.touched))
	}

	fixture.now = fixture.now.Add(30 * time.Second)
	if _, err := fixture.usecase.User(context.Background(), token); err != nil {
		t.Fatalf("resolve inside the touch gap: %v", err)
	}
	if len(fixture.session.touched) != 1 {
		t.Fatalf("the session was touched again inside the gap: %d", len(fixture.session.touched))
	}

	fixture.now = fixture.now.Add(2 * time.Hour)
	if _, err := fixture.usecase.User(context.Background(), token); !errors.Is(err, errs.ErrSessionNotFound) {
		t.Fatalf("an expired session must not resolve, got %v", err)
	}
}

func TestUserSlidesTheWindowForward(t *testing.T) {
	fixture := newAuthFixture(t)
	fixture.users.add("owner@example.com")

	if err := fixture.usecase.RequestOTP(context.Background(), "owner@example.com"); err != nil {
		t.Fatalf("request otp: %v", err)
	}
	token, _, err := fixture.usecase.Verify(context.Background(), "owner@example.com", "123456")
	if err != nil {
		t.Fatalf("verify: %v", err)
	}

	fixture.now = fixture.now.Add(50 * time.Minute)
	if _, err := fixture.usecase.User(context.Background(), token); err != nil {
		t.Fatalf("resolve: %v", err)
	}

	session := fixture.session.byHash[hashToken(token)]
	if !session.ExpiresAt.After(fixture.now.Add(time.Hour - time.Minute)) {
		t.Fatalf("the window was not slid forward: expires %s, now %s", session.ExpiresAt, fixture.now)
	}
}

func TestLogoutInvalidatesTheSession(t *testing.T) {
	fixture := newAuthFixture(t)
	fixture.users.add("owner@example.com")

	if err := fixture.usecase.RequestOTP(context.Background(), "owner@example.com"); err != nil {
		t.Fatalf("request otp: %v", err)
	}
	token, _, err := fixture.usecase.Verify(context.Background(), "owner@example.com", "123456")
	if err != nil {
		t.Fatalf("verify: %v", err)
	}

	if err := fixture.usecase.Logout(context.Background(), token); err != nil {
		t.Fatalf("logout: %v", err)
	}
	if _, err := fixture.usecase.User(context.Background(), token); !errors.Is(err, errs.ErrSessionNotFound) {
		t.Fatalf("the session survived logout: %v", err)
	}
	if err := fixture.usecase.Logout(context.Background(), token); err != nil {
		t.Fatalf("logging out twice must be harmless: %v", err)
	}
}

func TestBootstrapUpsertsAnAdminUser(t *testing.T) {
	fixture := newAuthFixture(t)

	user, err := fixture.usecase.Bootstrap(context.Background(), " Owner@Example.com ", "Owner")
	if err != nil {
		t.Fatalf("bootstrap: %v", err)
	}
	if user.Role != domain.UserRoleAdmin || user.Email != "owner@example.com" {
		t.Fatalf("unexpected bootstrap user: %+v", user)
	}

	again, err := fixture.usecase.Bootstrap(context.Background(), "owner@example.com", "Owner")
	if err != nil {
		t.Fatalf("bootstrap twice: %v", err)
	}
	if again.ID != user.ID {
		t.Fatalf("bootstrap created a second user: %s vs %s", again.ID, user.ID)
	}
	if len(fixture.users.byEmail) != 1 {
		t.Fatalf("expected one user, got %d", len(fixture.users.byEmail))
	}
}

func TestHashTokenIsDeterministicAndNotReversible(t *testing.T) {
	sum := sha256.Sum256([]byte("token"))
	if hashToken("token") != hex.EncodeToString(sum[:]) {
		t.Fatal("hashToken is not a sha256 of the input")
	}
	if hashToken("token") == "token" {
		t.Fatal("the token was stored in plaintext")
	}
}
