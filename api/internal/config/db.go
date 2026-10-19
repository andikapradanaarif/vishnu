package config

import (
	"fmt"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

type Database struct {
	Host    string
	Port    string
	Name    string
	User    string
	Pass    string
	SSLMode string
}

func LoadDatabase() Database {
	pass := os.Getenv("DB_PASS")
	if pass == "" && !isProduction() {
		pass = "vishnu"
	}
	return Database{
		Host:    getenv("DB_HOST", "127.0.0.1"),
		Port:    getenv("DB_PORT", "5432"),
		Name:    getenv("DB_NAME", "vishnu"),
		User:    getenv("DB_USER", "vishnu"),
		Pass:    pass,
		SSLMode: getenv("DB_SSL_MODE", "disable"),
	}
}

func (d Database) DSN() (string, error) {
	if d.Pass == "" {
		return "", fmt.Errorf("DB_PASS is required when VISHNU_ENV=%s", os.Getenv("VISHNU_ENV"))
	}
	if d.Host == "" || d.Port == "" || d.Name == "" || d.User == "" {
		return "", fmt.Errorf("DB_HOST, DB_PORT, DB_NAME and DB_USER are required")
	}
	return fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		d.Host, d.Port, d.User, d.Pass, d.Name, d.SSLMode,
	), nil
}

func (d Database) Address() string {
	return fmt.Sprintf("%s:%s/%s", d.Host, d.Port, d.Name)
}

func ConnectPostgres() (*gorm.DB, error) {
	database := LoadDatabase()

	dsn, err := database.DSN()
	if err != nil {
		return nil, err
	}

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		SkipDefaultTransaction: true,
		Logger:                 gormlogger.Default.LogMode(gormlogger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("connect to %s: %w", database.Address(), err)
	}
	return db, nil
}

func isProduction() bool {
	env := getenv("VISHNU_ENV", "development")
	return env == "production" || env == "prod"
}
