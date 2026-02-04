package config

import (
	"os"
	"strconv"
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
		// Use absolute path for WSL compatibility
		dbURL = "/mnt/j/p/Projects/esptein_files/data/archive.db"
	}

	corsOrigins := []string{"http://localhost:3000", "http://localhost:8080"}
	if origins := os.Getenv("CORS_ORIGINS"); origins != "" {
		corsOrigins = append(corsOrigins, origins)
	}

	return &Config{
		Port:        port,
		DatabaseURL: dbURL,
		CORSOrigins: corsOrigins,
	}
}

func GetEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return defaultVal
}
