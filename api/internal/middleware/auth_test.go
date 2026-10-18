package middleware

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
)

type fakeSessions struct {
	user *domain.User
	err  error
	seen []string
}

func (f *fakeSessions) User(_ context.Context, token string) (*domain.User, error) {
	f.seen = append(f.seen, token)
	if f.err != nil {
		return nil, f.err
	}
	return f.user, nil
}

func call(t *testing.T, app *fiber.App, req *http.Request) (int, string) {
	t.Helper()

	resp, err := app.Test(req)
	if err != nil {
		t.Fatalf("request: %v", err)
	}
	defer func() { _ = resp.Body.Close() }()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read body: %v", err)
	}
	return resp.StatusCode, string(body)
}

func TestAuthRejectsRequestsWithoutASession(t *testing.T) {
	app := fiber.New()
	app.Use("/api", Auth(&fakeSessions{err: errs.ErrSessionNotFound}))
	app.Get("/api/projects", func(c fiber.Ctx) error { return c.SendString("registry") })

	status, body := call(t, app, httptest.NewRequest("GET", "/api/projects", nil))
	if status != fiber.StatusUnauthorized || !strings.Contains(body, "unauthorized") {
		t.Fatalf("got %d %s, want 401 unauthorized", status, body)
	}
}

func TestAuthRejectsAnExpiredCookie(t *testing.T) {
	app := fiber.New()
	app.Use("/api", Auth(&fakeSessions{err: errs.ErrSessionNotFound}))
	app.Get("/api/projects", func(c fiber.Ctx) error { return c.SendString("registry") })

	req := httptest.NewRequest("GET", "/api/projects", nil)
	req.AddCookie(&http.Cookie{Name: SessionCookie, Value: "stale"})

	status, _ := call(t, app, req)
	if status != fiber.StatusUnauthorized {
		t.Fatalf("got %d, want 401", status)
	}
}

func TestAuthPassesRequestsWithAValidSession(t *testing.T) {
	sessions := &fakeSessions{user: &domain.User{ID: "u1", Email: "owner@example.com"}}

	app := fiber.New()
	app.Use("/api", Auth(sessions))
	app.Get("/api/projects", func(c fiber.Ctx) error {
		user, ok := c.Locals(UserLocal).(*domain.User)
		if !ok {
			return c.SendStatus(fiber.StatusInternalServerError)
		}
		return c.SendString(user.Email)
	})

	req := httptest.NewRequest("GET", "/api/projects", nil)
	req.AddCookie(&http.Cookie{Name: SessionCookie, Value: "token-1"})

	status, body := call(t, app, req)
	if status != fiber.StatusOK || body != "owner@example.com" {
		t.Fatalf("got %d %q, want the signed-in user", status, body)
	}
	if len(sessions.seen) != 1 || sessions.seen[0] != "token-1" {
		t.Fatalf("got %v, want the cookie to be resolved", sessions.seen)
	}
}

func TestAuthLeavesTheSignInRoutesOpen(t *testing.T) {
	app := fiber.New()
	app.Use("/api", Auth(&fakeSessions{err: errs.ErrSessionNotFound}))
	app.Post("/api/auth/verify", func(c fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })
	app.Get("/api/auth/me", func(c fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })

	for _, target := range []string{"/api/auth/verify", "/api/auth/me"} {
		status, _ := call(t, app, httptest.NewRequest("POST", target, nil))
		if status == fiber.StatusUnauthorized {
			t.Fatalf("%s must be reachable before signing in", target)
		}
	}
}

func TestAuthProtectsProjectProxyPaths(t *testing.T) {
	sessions := &fakeSessions{err: errors.New("no session")}

	app := fiber.New()
	app.Use("/p", Auth(sessions))
	app.All("/p/:pid/v1/*", func(c fiber.Ctx) error { return c.SendString("proxied") })

	status, _ := call(t, app, httptest.NewRequest("GET", "/p/abc/v1/workspaces", nil))
	if status != fiber.StatusUnauthorized {
		t.Fatalf("got %d, want 401 for an unauthenticated proxy request", status)
	}
}
