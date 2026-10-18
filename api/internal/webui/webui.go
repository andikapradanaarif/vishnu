// Package webui embeds the built web frontend (web/dist) into the
// binary. `make build` copies web/dist into this package's dist/
// directory first; the .gitkeep placeholder keeps the embed valid
// before a web build exists.
package webui

import (
	"embed"
	"io/fs"
)

//go:embed all:dist
var dist embed.FS

// FS returns the embedded dist/ contents as the root filesystem.
func FS() (fs.FS, error) {
	return fs.Sub(dist, "dist")
}
