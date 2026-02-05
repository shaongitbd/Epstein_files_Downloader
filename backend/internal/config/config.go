package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port        string
	DatabaseURL string
	CORSOrigins []string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Default to archive.db in the current working directory (backend root)
		dbURL = "./archive.db"
	}

	corsOrigins := []string{"http://localhost:3000", "http://localhost:8080"}
	if origins := os.Getenv("CORS_ORIGINS"); origins != "" {
		// Split comma-separated origins
		for _, origin := range splitAndTrim(origins) {
			if origin != "" {
				corsOrigins = append(corsOrigins, origin)
			}
		}
	}

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		CORSOrigins: corsOrigins,
	}
}

func splitAndTrim(s string) []string {
	parts := []string{}
	for _, p := range strings.Split(s, ",") {
		trimmed := strings.TrimSpace(p)
		if trimmed != "" {
			parts = append(parts, trimmed)
		}
	}
	return parts
}

func GetEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}
