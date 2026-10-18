package handler

import (
	"io/fs"
	"log/slog"
	"mime"
	"os"
	"path"
	"strings"

	"github.com/andikapradanaarif/vishnu/internal/webui"
	"github.com/gofiber/fiber/v3"
)

// WebHandler serves the built SPA: static assets straight from the
// filesystem, everything else falls back to index.html so client-side
// routes resolve on refresh.
type WebHandler struct {
	fsys fs.FS
}

// NewWebHandler serves dir from disk when set, otherwise the embedded
// web build.
func NewWebHandler(dir string) (*WebHandler, error) {
	if dir != "" {
		return &WebHandler{fsys: os.DirFS(dir)}, nil
	}
	embedded, err := webui.FS()
	if err != nil {
		return nil, err
	}
	if _, err := fs.Stat(embedded, "index.html"); err != nil {
		slog.Warn("Embedded web build missing index.html — run `make web` first or set VISHNU_WEB_DIR")
	}
	return &WebHandler{fsys: embedded}, nil
}

// Handle serves the request path, falling back to index.html for
// anything that isn't a real file.
func (h *WebHandler) Handle(c fiber.Ctx) error {
	name := strings.TrimPrefix(c.Path(), "/")
	name = path.Clean(name)
	if name == "." || name == "" || name == "/" {
		name = "index.html"
	}

	data, err := fs.ReadFile(h.fsys, name)
	if err != nil {
		data, err = fs.ReadFile(h.fsys, "index.html")
		if err != nil {
			return c.Status(fiber.StatusNotFound).SendString("web build not found")
		}
		name = "index.html"
	}

	if ext := path.Ext(name); ext != "" {
		if ctype := mime.TypeByExtension(ext); ctype != "" {
			c.Set("Content-Type", ctype)
		}
	}
	return c.Send(data)
}
