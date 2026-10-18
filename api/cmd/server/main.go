// Command server runs the vishnu web API: a Fiber app that serves the
// embedded SPA, exposes the project registry, and reverse-proxies /v1/*
// (including the SSE event stream) to a `crush server`.
package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v3"

	"github.com/andikapradanaarif/vishnu/internal/config"
	"github.com/andikapradanaarif/vishnu/internal/handler"
	"github.com/andikapradanaarif/vishnu/internal/migrator"
	"github.com/andikapradanaarif/vishnu/internal/repository"
	"github.com/andikapradanaarif/vishnu/internal/service"
	"github.com/andikapradanaarif/vishnu/internal/service/cloner"
	"github.com/andikapradanaarif/vishnu/internal/service/process"
	"github.com/andikapradanaarif/vishnu/internal/usecase"
)

func main() {
	cfg := config.Load()

	db, err := config.ConnectPostgres()
	if err != nil {
		slog.Error("Postgres unreachable — run `make db && make migrate`", "error", err)
		os.Exit(1)
	}

	runner := migrator.New(db)
	if err := runner.EnsureTable(); err != nil {
		slog.Error("Failed to initialize the migrations table", "error", err)
		os.Exit(1)
	}
	if err := runner.Up(); err != nil {
		slog.Error("Failed to apply migrations — run `make migrate`", "error", err)
		os.Exit(1)
	}

	upstream, err := service.NewUpstream(cfg.CrushUpstream)
	if err != nil {
		slog.Error("Invalid upstream", "error", err)
		os.Exit(1)
	}

	repositories := repository.NewRepositories(db)
	manager := process.NewManager(process.LoadOptions())
	clonerClient := cloner.New(cloner.LoadDir())
	crush := service.NewCrushClient()

	projects := usecase.NewProjectUsecase(repositories.Project, manager, clonerClient, crush)
	projectHandler := handler.NewProjectHandler(projects)
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

	projectHandler.Register(app)

	// Everything under /v1 goes to crush — including the SSE stream at
	// /v1/workspaces/{id}/events.
	app.All("/v1/*", proxy.Forward)

	// The SPA and its assets.
	app.Use("/", web.Handle)

	slog.Info("Vishnu listening",
		"addr", cfg.ListenAddr,
		"crush", cfg.CrushUpstream,
		"db", cfg.Database.Address(),
	)

	go func() {
		if err := app.Listen(cfg.ListenAddr, fiber.ListenConfig{DisableStartupMessage: true}); err != nil {
			slog.Error("Server error", "error", err)
			os.Exit(1)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, os.Interrupt, syscall.SIGTERM)
	<-sig

	shutdown, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = app.ShutdownWithContext(shutdown)

	// Children get a window of their own: the app shutdown above may have
	// spent most of its deadline waiting on in-flight requests.
	stop, cancelStop := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelStop()
	if err := manager.Shutdown(stop); err != nil {
		slog.Warn("Failed to stop every crush server", "error", err)
	}
}
