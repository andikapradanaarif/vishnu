package handler

import (
	"context"
	"errors"

	"github.com/gofiber/fiber/v3"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/middleware"
)

// UserService is the admin-facing user management surface.
type UserService interface {
	CreateUser(ctx context.Context, actor *domain.User, email, name, role string) (*domain.User, error)
}

type UserHandler struct {
	users UserService
}

func NewUserHandler(users UserService) *UserHandler {
	return &UserHandler{users: users}
}

// Register mounts the admin-only routes. It runs behind the session
// middleware, so the actor is always resolved before a request arrives here.
func (h *UserHandler) Register(app *fiber.App) {
	app.Post("/api/users", h.Create)
}

type createUserRequest struct {
	Email string `json:"email"`
	Name  string `json:"name"`
	Role  string `json:"role"`
}

func (h *UserHandler) Create(c fiber.Ctx) error {
	actor, _ := c.Locals(middleware.UserLocal).(*domain.User)
	if actor == nil {
		return errorJSON(c, fiber.StatusUnauthorized, "unauthorized", "unauthorized")
	}

	var req createUserRequest
	if err := c.Bind().Body(&req); err != nil {
		return errorJSON(c, fiber.StatusBadRequest, "invalid_request", "malformed request body")
	}

	user, err := h.users.CreateUser(c.RequestCtx(), actor, req.Email, req.Name, req.Role)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrForbidden):
			return errorJSON(c, fiber.StatusForbidden, "forbidden", "admin access required")
		case errors.Is(err, errs.ErrInvalidEmail),
			errors.Is(err, errs.ErrInvalidRole):
			return errorJSON(c, fiber.StatusBadRequest, "invalid_request", err.Error())
		case errors.Is(err, errs.ErrUserConflict):
			return errorJSON(c, fiber.StatusConflict, "conflict", "that address is already registered")
		default:
			return errorJSON(c, fiber.StatusInternalServerError, "internal_error", "failed to create the user")
		}
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"user": toUserResponse(user)})
}
