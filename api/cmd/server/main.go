// Command server runs the vishnu web API: a Fiber app that exposes the
// project registry and reverse-proxies /p/{pid}/v1/* (including the SSE
// event stream) to that project's `crush server`. The SPA is served
// separately — vite in dev, the vishnu-web nginx image in docker.
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
	"github.com/andikapradanaarif/vishnu/internal/middleware"
	"github.com/andikapradanaarif/vishnu/internal/migrator"
	"github.com/andikapradanaarif/vishnu/internal/repository"
	"github.com/andikapradanaarif/vishnu/internal/service"
	"github.com/andikapradanaarif/vishnu/internal/service/cloner"
	"github.com/andikapradanaarif/vishnu/internal/service/email"
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

	repositories := repository.NewRepositories(db)
	manager := process.NewManager(process.LoadOptions())
	clonerClient := cloner.New(cloner.LoadDir())
	crush := service.NewCrushClient()

	var mailer usecase.Mailer = email.NewLogService()
	if brevo, err := email.NewBrevoService(cfg); err != nil {
		slog.Warn("Brevo is not configured — sign-in codes are logged instead", "error", err)
	} else {
		mailer = brevo
	}

	auth := usecase.NewAuthUsecase(repositories.User, repositories.OTP, repositories.Session, mailer, cfg.SessionTTL)
	if cfg.BootstrapEmail != "" {
		user, err := auth.Bootstrap(context.Background(), cfg.BootstrapEmail, "Owner")
		if err != nil {
			slog.Error("Failed to prepare the bootstrap user", "error", err)
			os.Exit(1)
		}
		slog.Info("Bootstrap user ready", "email", user.Email, "role", user.Role)
	}

	projects := usecase.NewProjectUsecase(repositories.Project, manager, clonerClient, crush)
	projectHandler := handler.NewProjectHandler(projects)
	authHandler := handler.NewAuthHandler(auth)
	userHandler := handler.NewUserHandler(auth)
	proxy := handler.NewProxyHandler(repositories.Project, manager, crush, service.NewProxy())

	app := fiber.New(fiber.Config{
		// The agent accepts file contents in prompts; stay generous.
		BodyLimit: 64 * 1024 * 1024,
	})

	app.Get("/healthz", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Sign-in has to be reachable before a session exists.
	authHandler.Register(app)

	session := middleware.Auth(auth)
	app.Use("/api", session)

	projectHandler.Register(app)
	userHandler.Register(app)

	// Per-project crush traffic — including the SSE stream at
	// /p/{pid}/v1/workspaces/{id}/events. Auth is attached to the route
	// itself so the middleware cannot leak onto unrelated /p… paths.
	app.All("/p/:pid/v1/*", session, proxy.Forward)

	slog.Info("Vishnu listening",
		"addr", cfg.ListenAddr,
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
