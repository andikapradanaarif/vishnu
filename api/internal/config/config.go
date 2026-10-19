// Package config loads runtime configuration from the environment.
package config

import (
	"os"
	"time"
)

// Brevo holds the Brevo transactional-email configuration.
type Brevo struct {
	APIKey         string
	APIURL         string
	FromEmail      string
	FromName       string
	RequestTimeout string
}

// Config carries the server's runtime settings.
type Config struct {
	// ListenAddr is the address the web server binds to.
	ListenAddr string
	// WebDir, when set, serves the SPA from this directory instead of the
	// embedded build output.
	WebDir string
	// Environment prefixes email subjects unless "production"/"prod".
	Environment string
	// Brevo configures transactional email (auth OTP codes).
	Brevo Brevo
	// Database carries the Postgres connection settings (DB_* envs).
	Database Database
	// BootstrapEmail is upserted as an admin user at startup.
	BootstrapEmail string
	// SessionTTL is how long a sign-in lasts; the window slides on use.
	SessionTTL time.Duration
}

// Load reads configuration from environment variables.
func Load() *Config {
	return &Config{
		ListenAddr:  getenv("VISHNU_LISTEN_ADDR", "127.0.0.1:8080"),
		WebDir:      os.Getenv("VISHNU_WEB_DIR"),
		Environment: getenv("VISHNU_ENV", "development"),
		Brevo: Brevo{
			APIKey:         os.Getenv("BREVO_API_KEY"),
			APIURL:         getenv("BREVO_API_URL", "https://api.brevo.com"),
			FromEmail:      os.Getenv("BREVO_FROM_EMAIL"),
			FromName:       os.Getenv("BREVO_FROM_NAME"),
			RequestTimeout: getenv("VISHNU_EMAIL_TIMEOUT", "10s"),
		},
		Database:       LoadDatabase(),
		BootstrapEmail: os.Getenv("VISHNU_BOOTSTRAP_EMAIL"),
		SessionTTL:     getduration("VISHNU_SESSION_TTL", 720*time.Hour),
	}
}

func getduration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if parsed, err := time.ParseDuration(v); err == nil {
			return parsed
		}
	}
	return fallback
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
