package handler

import (
	"context"
	"strings"
	"testing"

	"github.com/gofiber/fiber/v3"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/middleware"
)

type fakeUserService struct {
	user  *domain.User
	err   error
	calls int
}

func (f *fakeUserService) CreateUser(_ context.Context, _ *domain.User, _, _, _ string) (*domain.User, error) {
	f.calls++
	return f.user, f.err
}

func userApp(actor *domain.User, service UserService) *fiber.App {
	app := fiber.New()
	app.Use(func(c fiber.Ctx) error {
		if actor != nil {
			c.Locals(middleware.UserLocal, actor)
		}
		return c.Next()
	})
	NewUserHandler(service).Register(app)
	return app
}

func TestCreateUserReturnsTheCreatedUser(t *testing.T) {
	service := &fakeUserService{user: &domain.User{
		ID:    "u1",
		Email: "new@example.com",
		Role:  domain.UserRoleMember,
	}}
	app := userApp(&domain.User{ID: "a1", Email: "admin@example.com", Role: domain.UserRoleAdmin}, service)

	resp, body := post(t, app, "/api/users", `{"email":"new@example.com","name":"New"}`)
	if resp.StatusCode != fiber.StatusCreated {
		t.Fatalf("got %d, want 201: %s", resp.StatusCode, body)
	}
	if !strings.Contains(body, `"email":"new@example.com"`) || !strings.Contains(body, `"role":"member"`) {
		t.Fatalf("unexpected body: %s", body)
	}
}

func TestCreateUserRequiresAnActor(t *testing.T) {
	app := userApp(nil, &fakeUserService{})

	resp, _ := post(t, app, "/api/users", `{"email":"new@example.com"}`)
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("got %d, want 401", resp.StatusCode)
	}
}

func TestCreateUserMapsErrorsToStatuses(t *testing.T) {
	admin := &domain.User{ID: "a1", Email: "admin@example.com", Role: domain.UserRoleAdmin}
	cases := []struct {
		err  error
		want int
	}{
		{errs.ErrForbidden, fiber.StatusForbidden},
		{errs.ErrInvalidEmail, fiber.StatusBadRequest},
		{errs.ErrInvalidRole, fiber.StatusBadRequest},
		{errs.ErrUserConflict, fiber.StatusConflict},
	}

	for _, tc := range cases {
		app := userApp(admin, &fakeUserService{err: tc.err})
		resp, _ := post(t, app, "/api/users", `{"email":"new@example.com"}`)
		if resp.StatusCode != tc.want {
			t.Fatalf("%v: got %d, want %d", tc.err, resp.StatusCode, tc.want)
		}
	}
}
