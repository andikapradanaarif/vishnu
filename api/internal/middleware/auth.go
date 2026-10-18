// Package middleware holds the HTTP concerns that sit in front of the
// routes: today, session authentication.
package middleware

import (
	"context"
	"strings"

	"github.com/gofiber/fiber/v3"

	"github.com/andikapradanaarif/vishnu/internal/domain"
)

const (
	SessionCookie = "vishnu_session"
	UserLocal     = "user"
)

type Sessions interface {
	User(ctx context.Context, token string) (*domain.User, error)
}

// Auth requires a live session for the registry and every project proxy
// path. The sign-in routes stay open, and so does the SPA shell, which
// renders the sign-in form.
func Auth(sessions Sessions) fiber.Handler {
	return func(c fiber.Ctx) error {
		if strings.HasPrefix(c.Path(), "/api/auth") {
			return c.Next()
		}

		token := c.Cookies(SessionCookie)
		if token == "" {
			return unauthorized(c)
		}

		user, err := sessions.User(c.RequestCtx(), token)
		if err != nil {
			return unauthorized(c)
		}

		c.Locals(UserLocal, user)
		return c.Next()
	}
}

func unauthorized(c fiber.Ctx) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"message": "unauthorized",
		"code":    "unauthorized",
	})
}
