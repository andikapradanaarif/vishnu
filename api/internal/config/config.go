// Package config loads runtime configuration from the environment.
package config

import "os"

// Config carries the server's runtime settings.
type Config struct {
	// ListenAddr is the address the web server binds to.
	ListenAddr string
	// CrushUpstream is the base URL of the `crush server` instance every
	// /v1/* request is proxied to (e.g. http://127.0.0.1:9119).
	CrushUpstream string
	// WebDir, when set, serves the SPA from this directory instead of the
	// embedded build output.
	WebDir string
}

// Load reads configuration from environment variables.
func Load() *Config {
	return &Config{
		ListenAddr:    getenv("VISHNU_LISTEN_ADDR", "127.0.0.1:8080"),
		CrushUpstream: getenv("VISHNU_CRUSH_UPSTREAM", "http://127.0.0.1:9119"),
		WebDir:        os.Getenv("VISHNU_WEB_DIR"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
