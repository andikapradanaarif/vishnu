package migrator

import (
	"errors"
	"fmt"
	"io/fs"
	"log/slog"

	"gorm.io/gorm"

	"github.com/andikapradanaarif/vishnu/migration"
)

var ErrNoDownMigration = errors.New("no down migration file found")

type Runner struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Runner {
	return &Runner{db: db}
}

func (r *Runner) EnsureTable() error {
	sql, err := migration.GetCreateMigrationsTableSQL()
	if err != nil {
		return fmt.Errorf("load migrations table SQL: %w", err)
	}
	if err := r.db.Exec(sql).Error; err != nil {
		return fmt.Errorf("create migrations table: %w", err)
	}
	return nil
}

func (r *Runner) Up() error {
	for _, m := range migration.MigrationOrder {
		applied, err := r.isApplied(m)
		if err != nil {
			return fmt.Errorf("check migration status for %s: %w", m, err)
		}
		if applied {
			slog.Info("Skipping already applied migration", "name", m)
			continue
		}

		slog.Info("Running migration", "name", m)
		sqlScript, err := migration.GetMigrationSQL(m)
		if err != nil {
			return fmt.Errorf("load migration %s: %w", m, err)
		}

		if err := r.execInTx(func(tx *gorm.DB) error {
			if err := tx.Exec(sqlScript).Error; err != nil {
				return err
			}
			return tx.Exec("INSERT INTO migrations (name) VALUES ($1)", m).Error
		}); err != nil {
			return fmt.Errorf("execute migration %s: %w", m, err)
		}
		slog.Info("Migration applied successfully", "name", m)
	}
	slog.Info("All migrations completed successfully")
	return nil
}

func (r *Runner) Down() error {
	last, err := r.lastApplied()
	if err != nil {
		return fmt.Errorf("get last applied migration: %w", err)
	}
	if last == "" {
		slog.Info("No migrations to roll back")
		return nil
	}

	sqlScript, err := migration.GetDownMigrationSQL(last)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return fmt.Errorf("%w: %s", ErrNoDownMigration, last)
		}
		return fmt.Errorf("load down migration for %s: %w", last, err)
	}

	slog.Info("Rolling back migration", "name", last)
	if err := r.execInTx(func(tx *gorm.DB) error {
		if err := tx.Exec(sqlScript).Error; err != nil {
			return err
		}
		return tx.Exec("DELETE FROM migrations WHERE name = $1", last).Error
	}); err != nil {
		return fmt.Errorf("execute down migration %s: %w", last, err)
	}
	slog.Info("Migration rolled back successfully", "name", last)
	return nil
}

type Status struct {
	Name    string
	Applied bool
}

func (r *Runner) Status() ([]Status, error) {
	applied, err := r.appliedSet()
	if err != nil {
		return nil, fmt.Errorf("load applied migrations: %w", err)
	}
	out := make([]Status, 0, len(migration.MigrationOrder))
	for _, m := range migration.MigrationOrder {
		out = append(out, Status{Name: m, Applied: applied[m]})
	}
	return out, nil
}

func (r *Runner) Version() (string, error) {
	return r.lastApplied()
}

func (r *Runner) isApplied(name string) (bool, error) {
	var count int64
	if err := r.db.Raw(migration.GetCheckMigrationSQL(), name).Scan(&count).Error; err != nil {
		return false, err
	}
	return count > 0, nil
}

func (r *Runner) lastApplied() (string, error) {
	var name string
	if err := r.db.Raw("SELECT name FROM migrations ORDER BY id DESC LIMIT 1").Scan(&name).Error; err != nil {
		return "", err
	}
	return name, nil
}

func (r *Runner) appliedSet() (map[string]bool, error) {
	var names []string
	if err := r.db.Raw("SELECT name FROM migrations ORDER BY id ASC").Scan(&names).Error; err != nil {
		return nil, err
	}
	set := make(map[string]bool, len(names))
	for _, n := range names {
		set[n] = true
	}
	return set, nil
}

func (r *Runner) execInTx(fn func(tx *gorm.DB) error) error {
	tx := r.db.Begin()
	if tx.Error != nil {
		return tx.Error
	}
	if err := fn(tx); err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}
