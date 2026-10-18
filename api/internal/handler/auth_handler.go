package handler

import (
	"context"
	"errors"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/andikapradanaarif/vishnu/internal/domain"
	"github.com/andikapradanaarif/vishnu/internal/errs"
	"github.com/andikapradanaarif/vishnu/internal/middleware"
)

type AuthService interface {
	RequestOTP(ctx context.Context, email string) error
	Verify(ctx context.Context, email, code string) (string, *domain.User, error)
	Logout(ctx context.Context, token string) error
	User(ctx context.Context, token string) (*domain.User, error)
	TTL() time.Duration
}

type AuthHandler struct {
	auth AuthService
}

func NewAuthHandler(auth AuthService) *AuthHandler {
	return &AuthHandler{auth: auth}
}

func (h *AuthHandler) Register(app *fiber.App) {
	app.Post("/api/auth/request-otp", h.RequestOTP)
	app.Post("/api/auth/verify", h.Verify)
	app.Post("/api/auth/logout", h.Logout)
	app.Get("/api/auth/me", h.Me)
}

type requestOTPRequest struct {
	Email string `json:"email"`
}

type verifyRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

type userResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
	Role  string `json:"role"`
}

// RequestOTP answers 200 for every well-formed address, registered or not.
func (h *AuthHandler) RequestOTP(c fiber.Ctx) error {
	var req requestOTPRequest
	if err := c.Bind().Body(&req); err != nil {
		return errorJSON(c, fiber.StatusBadRequest, "invalid_request", "malformed request body")
	}

	if err := h.auth.RequestOTP(c.RequestCtx(), req.Email); err != nil {
		if errors.Is(err, errs.ErrInvalidEmail) {
			return errorJSON(c, fiber.StatusBadRequest, "invalid_email", err.Error())
		}
		return errorJSON(c, fiber.StatusInternalServerError, "internal_error", "failed to send a code")
	}

	return c.JSON(fiber.Map{"message": "if that address is registered, a code is on its way"})
}

func (h *AuthHandler) Verify(c fiber.Ctx) error {
	var req verifyRequest
	if err := c.Bind().Body(&req); err != nil {
		return errorJSON(c, fiber.StatusBadRequest, "invalid_request", "malformed request body")
	}

	token, user, err := h.auth.Verify(c.RequestCtx(), req.Email, req.Code)
	if err != nil {
		switch {
		case errors.Is(err, errs.ErrOTPAttemptsExhausted):
			return errorJSON(c, fiber.StatusTooManyRequests, "too_many_attempts", "too many incorrect attempts")
		case errors.Is(err, errs.ErrOTPExpired):
			return errorJSON(c, fiber.StatusUnauthorized, "code_expired", "the code has expired")
		case errors.Is(err, errs.ErrOTPInvalid), errors.Is(err, errs.ErrOTPNotFound):
			return errorJSON(c, fiber.StatusUnauthorized, "invalid_code", "invalid code")
		default:
			return errorJSON(c, fiber.StatusInternalServerError, "internal_error", "failed to verify the code")
		}
	}

	h.startSession(c, token)
	return c.JSON(fiber.Map{"user": toUserResponse(user)})
}

func (h *AuthHandler) Logout(c fiber.Ctx) error {
	if err := h.auth.Logout(c.RequestCtx(), c.Cookies(middleware.SessionCookie)); err != nil {
		return errorJSON(c, fiber.StatusInternalServerError, "internal_error", "failed to sign out")
	}

	h.clearSession(c)
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *AuthHandler) Me(c fiber.Ctx) error {
	user, err := h.auth.User(c.RequestCtx(), c.Cookies(middleware.SessionCookie))
	if err != nil {
		return errorJSON(c, fiber.StatusUnauthorized, "unauthorized", "unauthorized")
	}
	return c.JSON(fiber.Map{"user": toUserResponse(user)})
}

func (h *AuthHandler) startSession(c fiber.Ctx, token string) {
	c.Cookie(&fiber.Cookie{
		Name:     middleware.SessionCookie,
		Value:    token,
		Path:     "/",
		HTTPOnly: true,
		SameSite: "Lax",
		Secure:   c.Protocol() == "https",
		Expires:  time.Now().Add(h.auth.TTL()),
	})
}

func (h *AuthHandler) clearSession(c fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     middleware.SessionCookie,
		Value:    "",
		Path:     "/",
		HTTPOnly: true,
		SameSite: "Lax",
		Secure:   c.Protocol() == "https",
		Expires:  time.Now().Add(-time.Hour),
	})
}

func toUserResponse(user *domain.User) userResponse {
	response := userResponse{
		ID:    user.ID,
		Email: user.Email,
		Role:  string(user.Role),
	}
	if user.Name != nil {
		response.Name = *user.Name
	}
	return response
}
