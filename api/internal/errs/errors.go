// Package errs holds the sentinels shared across layers. Repositories
// translate driver errors into these; usecases and handlers compare with
// errors.Is instead of inspecting GORM or Postgres errors.
package errs

import "errors"

var (
	ErrProjectNotFound = errors.New("project not found")
	ErrProjectConflict = errors.New("project already exists")
	ErrPortConflict    = errors.New("project port already in use")

	ErrInvalidProject  = errors.New("exactly one of repo_url, path or upstream is required")
	ErrInvalidPath     = errors.New("path must be an existing directory")
	ErrInvalidUpstream = errors.New("upstream must be an http(s) URL")

	ErrUserNotFound         = errors.New("user not found")
	ErrInvalidEmail         = errors.New("a valid email address is required")
	ErrSessionNotFound      = errors.New("session not found")
	ErrOTPNotFound          = errors.New("no pending code for that address")
	ErrOTPExpired           = errors.New("the code has expired")
	ErrOTPInvalid           = errors.New("invalid code")
	ErrOTPAttemptsExhausted = errors.New("too many incorrect attempts")
)
