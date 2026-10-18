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
)
