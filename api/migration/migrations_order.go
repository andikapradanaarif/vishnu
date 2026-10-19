package migration

import (
	"embed"
	"errors"
	"fmt"
	"io/fs"
)

//go:embed *.sql
var migrationFiles embed.FS

var MigrationOrder = []string{
	"create_projects_table",
}

func GetCreateMigrationsTableSQL() (string, error) {
	return readMigrationFile("create_migrations_table.sql")
}

func GetMigrationSQL(name string) (string, error) {
	return readMigrationFile(name + ".sql")
}

func GetDownMigrationSQL(name string) (string, error) {
	return readMigrationFile(name + "_down.sql")
}

func GetCheckMigrationSQL() string {
	return "SELECT COUNT(*) FROM migrations WHERE name = $1"
}

func readMigrationFile(filename string) (string, error) {
	sqlBytes, err := migrationFiles.ReadFile(filename)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return "", fmt.Errorf("migration file %s not found: %w", filename, fs.ErrNotExist)
		}
		return "", fmt.Errorf("failed to read migration file %s: %w", filename, err)
	}
	return string(sqlBytes), nil
}
