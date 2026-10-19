package main

import (
	"fmt"
	"log/slog"
	"os"

	"github.com/andikapradanaarif/vishnu/internal/config"
	"github.com/andikapradanaarif/vishnu/internal/migrator"
)

func main() {
	command := "up"
	if len(os.Args) > 1 {
		command = os.Args[1]
	}

	db, err := config.ConnectPostgres()
	if err != nil {
		slog.Error("Failed to connect to the database", "error", err)
		os.Exit(1)
	}

	runner := migrator.New(db)
	if err := runner.EnsureTable(); err != nil {
		slog.Error("Failed to initialize migrations table", "error", err)
		os.Exit(1)
	}

	switch command {
	case "up":
		if err := runner.Up(); err != nil {
			slog.Error("Failed to apply migrations", "error", err)
			os.Exit(1)
		}
	case "down":
		if err := runner.Down(); err != nil {
			slog.Error("Failed to rollback migration", "error", err)
			os.Exit(1)
		}
	case "status":
		status, err := runner.Status()
		if err != nil {
			slog.Error("Failed to read migration status", "error", err)
			os.Exit(1)
		}
		for _, s := range status {
			state := "pending"
			if s.Applied {
				state = "applied"
			}
			fmt.Printf("%-40s %s\n", s.Name, state)
		}
	default:
		slog.Error("Unknown command", "command", command, "hint", "use 'up', 'down', or 'status'")
		os.Exit(1)
	}
}
