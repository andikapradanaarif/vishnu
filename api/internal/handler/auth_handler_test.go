package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/middleware"
)

type fakeAuth struct {
	requestErr error
	token      string
	user       *domain.User
	verifyErr  error
	logoutErr  error
	meUser     *domain.User
	meErr      error
}

func (f *fakeAuth) RequestOTP(context.Context, string) error {
	return f.requestErr
}

func (f *fakeAuth) Verify(context.Context, string, string) (string, *domain.User, error) {
	return f.token, f.user, f.verifyErr
}

func (f *fakeAuth) Logout(context.Context, string) error {
	return f.logoutErr
}

func (f *fakeAuth) User(context.Context, string) (*domain.User, error) {
	return f.meUser, f.meErr
}

func (f *fakeAuth) TTL() time.Duration {
	return time.Hour
}

func authApp(auth AuthService) *fiber.App {
	app := fiber.New()
	NewAuthHandler(auth).Register(app)
	return app
}

func post(t *testing.T, app *fiber.App, target, body string) (*http.Response, string) {
	t.Helper()

	req := httptest.NewRequest("POST", target, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("POST %s: %v", target, err)
	}
	payload := make([]byte, 1024)
	n, _ := resp.Body.Read(payload)
	_ = resp.Body.Close()

	return resp, string(payload[:n])
}

func TestRequestOTPAnswers200ForUnknownAddresses(t *testing.T) {
	app := authApp(&fakeAuth{})

	resp, body := post(t, app, "/api/auth/request-otp", `{"email":"stranger@example.com"}`)
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("got %d %s, want 200 with no hint about membership", resp.StatusCode, body)
	}
	if strings.Contains(strings.ToLower(body), "unknown") || strings.Contains(strings.ToLower(body), "not found") {
		t.Fatalf("the response leaks membership: %s", body)
	}
}

func TestRequestOTPRejectsMalformedBodies(t *testing.T) {
	app := authApp(&fakeAuth{})

	resp, body := post(t, app, "/api/auth/request-otp", "{")
	if resp.StatusCode != fiber.StatusBadRequest || !strings.Contains(body, "invalid_request") {
		t.Fatalf("got %d %s, want 400 invalid_request", resp.StatusCode, body)
	}
}

func TestVerifySetsAnHttpOnlyCookie(t *testing.T) {
	app := authApp(&fakeAuth{
		token: "session-token",
		user:  &domain.User{ID: "u1", Email: "owner@example.com", Role: domain.UserRoleAdmin},
	})

	resp, body := post(t, app, "/api/auth/verify", `{"email":"owner@example.com","code":"123456"}`)
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("got %d %s, want 200", resp.StatusCode, body)
	}

	cookie := sessionCookie(t, resp)
	if cookie.Value != "session-token" {
		t.Fatalf("got cookie value %q", cookie.Value)
	}
	if !cookie.HttpOnly {
		t.Fatal("the session cookie must be HttpOnly")
	}
	if cookie.SameSite != http.SameSiteLaxMode {
		t.Fatalf("got SameSite %v, want Lax", cookie.SameSite)
	}
	if cookie.Path != "/" {
		t.Fatalf("got path %q, want /", cookie.Path)
	}
	if !strings.Contains(body, "owner@example.com") {
		t.Fatalf("the response does not carry the user: %s", body)
	}
}

func TestVerifyMapsCodeFailures(t *testing.T) {
	cases := []struct {
		name     string
		err      error
		wantCode int
		wantBody string
	}{
		{"invalid", errs.ErrOTPInvalid, fiber.StatusUnauthorized, "invalid_code"},
		{"missing", errs.ErrOTPNotFound, fiber.StatusUnauthorized, "invalid_code"},
		{"expired", errs.ErrOTPExpired, fiber.StatusUnauthorized, "code_expired"},
		{"locked", errs.ErrOTPAttemptsExhausted, fiber.StatusTooManyRequests, "too_many_attempts"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			app := authApp(&fakeAuth{verifyErr: tc.err})

			resp, body := post(t, app, "/api/auth/verify", `{"email":"owner@example.com","code":"000000"}`)
			if resp.StatusCode != tc.wantCode || !strings.Contains(body, tc.wantBody) {
				t.Fatalf("got %d %s, want %d %s", resp.StatusCode, body, tc.wantCode, tc.wantBody)
			}
			if len(resp.Cookies()) != 0 {
				t.Fatal("a failed verification must not set a session cookie")
			}
		})
	}
}

func TestLogoutClearsTheCookie(t *testing.T) {
	app := authApp(&fakeAuth{})

	resp, _ := post(t, app, "/api/auth/logout", "")
	if resp.StatusCode != fiber.StatusNoContent {
		t.Fatalf("got %d, want 204", resp.StatusCode)
	}

	cookie := sessionCookie(t, resp)
	if cookie.Value != "" || cookie.Expires.After(time.Now()) {
		t.Fatalf("the cookie was not cleared: %+v", cookie)
	}
}

func TestMeRequiresAndReturnsASession(t *testing.T) {
	app := authApp(&fakeAuth{meErr: errs.ErrSessionNotFound})

	req := httptest.NewRequest("GET", "/api/auth/me", nil)
	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("me: %v", err)
	}
	_ = resp.Body.Close()
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("got %d, want 401", resp.StatusCode)
	}

	app = authApp(&fakeAuth{meUser: &domain.User{ID: "u1", Email: "owner@example.com", Role: domain.UserRoleAdmin}})
	req = httptest.NewRequest("GET", "/api/auth/me", nil)
	req.AddCookie(&http.Cookie{Name: middleware.SessionCookie, Value: "session-token"})

	resp, err = app.Test(req)
	if err != nil {
		t.Fatalf("me: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()

	payload := make([]byte, 512)
	n, _ := resp.Body.Read(payload)
	if resp.StatusCode != fiber.StatusOK || !strings.Contains(string(payload[:n]), "owner@example.com") {
		t.Fatalf("got %d %s, want the signed-in user", resp.StatusCode, payload[:n])
	}
}

func sessionCookie(t *testing.T, resp *http.Response) *http.Cookie {
	t.Helper()

	for _, cookie := range resp.Cookies() {
		if cookie.Name == middleware.SessionCookie {
			return cookie
		}
	}
	t.Fatalf("response carries no %s cookie", middleware.SessionCookie)
	return nil
}
