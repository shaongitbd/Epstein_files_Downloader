package models

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

// JSON type for GORM
type JSON map[string]interface{}

func (j JSON) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

func (j *JSON) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, j)
}

// Document represents a PDF document
type Document struct {
	ID        string    `gorm:"primaryKey;size:50" json:"id"`
	Filename  string    `gorm:"size:255;not null" json:"filename"`
	PageCount int       `gorm:"default:0" json:"page_count"`
	FullText  string    `gorm:"type:text" json:"-"` // Excluded from JSON, used for FTS
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`

	// Relations
	Images []Image `gorm:"foreignKey:DocumentID" json:"images,omitempty"`
}

// Image represents an extracted image from a PDF
type Image struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	DocumentID string    `gorm:"size:50;index;not null" json:"document_id"`
	Page       int       `gorm:"not null" json:"page"`
	Filename   string    `gorm:"size:255" json:"filename"`
	CDNUrl     string    `gorm:"size:500" json:"cdn_url"`
	Width      int       `gorm:"default:0" json:"width"`
	Height     int       `gorm:"default:0" json:"height"`
	SizeBytes  int64     `gorm:"default:0" json:"size_bytes"`
	Format     string    `gorm:"size:20" json:"format"`
	Exif       JSON      `gorm:"type:json" json:"exif,omitempty"`
	HasGPS     bool      `gorm:"default:false;index" json:"has_gps"`
	DateTaken  string    `gorm:"size:50;index" json:"date_taken,omitempty"`
	PageText   string    `gorm:"type:text" json:"page_text,omitempty"`
	CreatedAt  time.Time `gorm:"autoCreateTime" json:"created_at"`

	// Relations
	Document *Document `gorm:"foreignKey:DocumentID" json:"document,omitempty"`
}

// Stats for the archive
type Stats struct {
	TotalDocuments  int64 `json:"total_documents"`
	TotalImages     int64 `json:"total_images"`
	ImagesWithGPS   int64 `json:"images_with_gps"`
	ImagesWithDate  int64 `json:"images_with_date"`
	TotalSizeBytes  int64 `json:"total_size_bytes"`
}

// Pagination cursor
type Cursor struct {
	LastID    uint   `json:"last_id,omitempty"`
	LastValue string `json:"last_value,omitempty"`
}

// Paginated response
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	NextCursor string      `json:"next_cursor,omitempty"`
	HasMore    bool        `json:"has_more"`
	Total      int64       `json:"total,omitempty"`
}

// Search result
type SearchResult struct {
	Documents []Document `json:"documents"`
	Images    []Image    `json:"images"`
	Query     string     `json:"query"`
	Total     int64      `json:"total"`
}

// AutoMigrate runs database migrations
func AutoMigrate(db *gorm.DB) error {
	err := db.AutoMigrate(&Document{}, &Image{})
	if err != nil {
		return err
	}

	// Try to create FTS5 virtual table for full-text search
	// FTS5 may not be available in all SQLite builds
	var count int64
	db.Raw("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='documents_fts'").Scan(&count)

	if count == 0 {
		// Try FTS5 first, fall back to FTS4 if not available
		err = db.Exec(`
			CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
				document_id,
				full_text
			)
		`).Error

		if err != nil {
			// FTS5 not available, try FTS4
			err = db.Exec(`
				CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts4(
					document_id,
					full_text
				)
			`).Error

			if err != nil {
				// Log warning but don't fail - search will use LIKE fallback
				println("Warning: FTS not available, search will use LIKE fallback")
			}
		}
	}

	return nil
}
