package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/epstein-files/backend/internal/config"
	"github.com/epstein-files/backend/internal/handlers"
	"github.com/epstein-files/backend/internal/models"
	"github.com/epstein-files/backend/internal/repository"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Setup database
	db, err := setupDatabase(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Run migrations
	if err := models.AutoMigrate(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize repository and handlers
	repo := repository.New(db)
	h := handlers.New(repo)

	// Setup Gin
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Recovery())
	r.Use(gin.LoggerWithFormatter(logFormatter))

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     cfg.CORSOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Routes
	api := r.Group("/api")
	{
		api.GET("/health", h.Health)
		api.GET("/stats", h.GetStats)

		api.GET("/images", h.GetImages)
		api.GET("/images/:id", h.GetImageByID)

		api.GET("/documents", h.GetDocuments)
		api.GET("/documents/:id", h.GetDocumentByID)

		api.GET("/search", h.Search)
	}

	// Start server
	log.Printf("Starting server on :%s", cfg.Port)
	log.Printf("Database: %s", cfg.DatabaseURL)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func setupDatabase(dbURL string) (*gorm.DB, error) {
	// SQLite configuration for better performance
	db, err := gorm.Open(sqlite.Open(dbURL+"?_journal_mode=WAL&_synchronous=NORMAL&_cache_size=10000"), &gorm.Config{
		Logger: logger.New(
			log.New(os.Stdout, "\r\n", log.LstdFlags),
			logger.Config{
				SlowThreshold:             200 * time.Millisecond,
				LogLevel:                  logger.Warn,
				IgnoreRecordNotFoundError: true,
				Colorful:                  true,
			},
		),
	})
	if err != nil {
		return nil, err
	}

	// Connection pool settings
	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}
	sqlDB.SetMaxOpenConns(1) // SQLite only supports one writer
	sqlDB.SetMaxIdleConns(1)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return db, nil
}

func logFormatter(param gin.LogFormatterParams) string {
	return fmt.Sprintf("[%s] %s %s %d %s\n",
		param.TimeStamp.Format("15:04:05"),
		param.Method,
		param.Path,
		param.StatusCode,
		param.Latency,
	)
}
