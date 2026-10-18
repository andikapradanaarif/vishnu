package migration

import (
	"strings"
	"testing"
)

func TestMigrationOrderFilesResolve(t *testing.T) {
	for _, name := range MigrationOrder {
		t.Run(name, func(t *testing.T) {
			if _, err := GetMigrationSQL(name); err != nil {
				t.Fatalf("MigrationOrder entry %q has no readable %s.sql: %v", name, name, err)
			}
		})
	}
}

func TestEmbeddedMigrationsAreRegistered(t *testing.T) {
	entries, err := migrationFiles.ReadDir(".")
	if err != nil {
		t.Fatalf("read embedded migrations: %v", err)
	}
	registered := map[string]bool{}
	for _, name := range MigrationOrder {
		registered[name] = true
	}
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".sql") {
			continue
		}
		name := strings.TrimSuffix(e.Name(), ".sql")
		if strings.HasSuffix(name, "_down") || name == "create_migrations_table" {
			continue
		}
		if !registered[name] {
			t.Errorf("embedded %s is not in MigrationOrder — it will never run", e.Name())
		}
	}
}

func TestMigrationOrderHasDownMigrations(t *testing.T) {
	for _, name := range MigrationOrder {
		t.Run(name, func(t *testing.T) {
			if _, err := GetDownMigrationSQL(name); err != nil {
				t.Fatalf("MigrationOrder entry %q has no readable %s_down.sql: %v", name, name, err)
			}
		})
	}
}
