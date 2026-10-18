// Command server runs the vishnu web API: a Fiber app that serves the
// embedded SPA and reverse-proxies /v1/* (including the SSE event
// stream) to a `crush server` upstream.
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/andikapradanaarif/vishnu/internal/config"
	"github.com/andikapradanaarif/vishnu/internal/handler"
	"github.com/andikapradanaarif/vishnu/internal/service"
	"github.com/gofiber/fiber/v3"
)

func main() {
	cfg := config.Load()

	upstream, err := service.NewUpstream(cfg.CrushUpstream)
	if err != nil {
		slog.Error("Invalid upstream", "error", err)
		os.Exit(1)
	}

	proxy := handler.NewProxyHandler(upstream)
	web, err := handler.NewWebHandler(cfg.WebDir)
	if err != nil {
		slog.Error("Failed to init web handler", "error", err)
		os.Exit(1)
	}

	app := fiber.New(fiber.Config{
		// The agent accepts file contents in prompts; stay generous.
		BodyLimit: 64 * 1024 * 1024,
	})

	app.Get("/healthz", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "upstream": upstream.Base()})
	})

	// Everything under /v1 goes to crush — including the SSE stream at
	// /v1/workspaces/{id}/events.
	app.All("/v1/*", proxy.Forward)

	// The SPA and its assets.
	app.Use("/", web.Handle)

	slog.Info("Vishnu listening", "addr", cfg.ListenAddr, "crush", cfg.CrushUpstream)

	go func() {
		if err := app.Listen(cfg.ListenAddr, fiber.ListenConfig{DisableStartupMessage: true}); err != nil {
			slog.Error("Server error", "error", err)
			os.Exit(1)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = app.ShutdownWithContext(ctx)
}
