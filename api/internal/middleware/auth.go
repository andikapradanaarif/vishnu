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

// authPrefix roots the sign-in routes, which stay reachable before a session
// exists.
const authPrefix = "/api/auth"

// isAuthRoute matches the sign-in routes on a path boundary. A plain prefix
// match would also open up any later route that happens to start with the same
// characters, such as /api/authors or /api/authz/roles.
func isAuthRoute(path string) bool {
	return path == authPrefix || strings.HasPrefix(path, authPrefix+"/")
}

type Sessions interface {
	User(ctx context.Context, token string) (*domain.User, error)
}

// Auth requires a live session for the registry and every project proxy
// path. The sign-in routes stay open, and so does the SPA shell, which
// renders the sign-in form.
func Auth(sessions Sessions) fiber.Handler {
	return func(c fiber.Ctx) error {
		if isAuthRoute(c.Path()) {
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
