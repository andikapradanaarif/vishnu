// Package errs holds the sentinels shared across layers. Repositories
// translate driver errors into these; usecases and handlers compare with
// errors.Is instead of inspecting GORM or Postgres errors.
package errs

import "errors"

var (
	ErrProjectNotFound = errors.New("project not found")
	ErrProjectConflict = errors.New("project already exists")
)
