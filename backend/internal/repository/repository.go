package repository

import (
	"encoding/base64"
	"encoding/json"
	"fmt"

	"github.com/epstein-files/backend/internal/models"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func New(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

// ============================================================================
// IMAGES
// ============================================================================

type ImageFilters struct {
	HasGPS      *bool
	HasDate     *bool
	HasText     *bool
	DocumentID  string
	SearchQuery string
}

func (r *Repository) GetImages(cursor string, limit int, filters ImageFilters) (*models.PaginatedResponse, error) {
	var images []models.Image
	query := r.db.Model(&models.Image{})

	// Apply filters
	if filters.HasGPS != nil && *filters.HasGPS {
		query = query.Where("has_gps = ?", true)
	}
	if filters.HasDate != nil && *filters.HasDate {
		query = query.Where("date_taken IS NOT NULL AND date_taken != ''")
	}
	if filters.HasText != nil && *filters.HasText {
		query = query.Where("page_text IS NOT NULL AND page_text != ''")
	}
	if filters.DocumentID != "" {
		query = query.Where("document_id = ?", filters.DocumentID)
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Apply cursor
	if cursor != "" {
		decoded, err := decodeCursor(cursor)
		if err == nil && decoded.LastID > 0 {
			query = query.Where("id > ?", decoded.LastID)
		}
	}

	// Fetch with limit + 1 to check if there are more
	err := query.Order("id ASC").Limit(limit + 1).Find(&images).Error
	if err != nil {
		return nil, err
	}

	hasMore := len(images) > limit
	if hasMore {
		images = images[:limit]
	}

	var nextCursor string
	if hasMore && len(images) > 0 {
		nextCursor = encodeCursor(models.Cursor{LastID: images[len(images)-1].ID})
	}

	return &models.PaginatedResponse{
		Data:       images,
		NextCursor: nextCursor,
		HasMore:    hasMore,
		Total:      total,
	}, nil
}

func (r *Repository) GetImageByID(id uint) (*models.Image, error) {
	var image models.Image
	err := r.db.Preload("Document").First(&image, id).Error
	if err != nil {
		return nil, err
	}
	return &image, nil
}

// ============================================================================
// DOCUMENTS
// ============================================================================

func (r *Repository) GetDocuments(cursor string, limit int) (*models.PaginatedResponse, error) {
	var documents []models.Document
	query := r.db.Model(&models.Document{})

	// Get total count
	var total int64
	query.Count(&total)

	// Apply cursor
	if cursor != "" {
		decoded, err := decodeCursor(cursor)
		if err == nil && decoded.LastValue != "" {
			query = query.Where("id > ?", decoded.LastValue)
		}
	}

	// Fetch with limit + 1
	err := query.Order("id ASC").Limit(limit + 1).Find(&documents).Error
	if err != nil {
		return nil, err
	}

	hasMore := len(documents) > limit
	if hasMore {
		documents = documents[:limit]
	}

	var nextCursor string
	if hasMore && len(documents) > 0 {
		nextCursor = encodeCursor(models.Cursor{LastValue: documents[len(documents)-1].ID})
	}

	return &models.PaginatedResponse{
		Data:       documents,
		NextCursor: nextCursor,
		HasMore:    hasMore,
		Total:      total,
	}, nil
}

func (r *Repository) GetDocumentByID(id string) (*models.Document, error) {
	var document models.Document
	err := r.db.Preload("Images").First(&document, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &document, nil
}

// ============================================================================
// SEARCH
// ============================================================================

func (r *Repository) Search(query string, limit int) (*models.SearchResult, error) {
	result := &models.SearchResult{
		Query:     query,
		Documents: []models.Document{},
		Images:    []models.Image{},
	}

	if query == "" {
		return result, nil
	}

	// Search using FTS5
	var documentIDs []string
	searchQuery := fmt.Sprintf("%s*", query) // Prefix search

	err := r.db.Raw(`
		SELECT document_id FROM documents_fts
		WHERE documents_fts MATCH ?
		ORDER BY rank
		LIMIT ?
	`, searchQuery, limit).Scan(&documentIDs).Error

	if err != nil {
		// Fallback to LIKE search if FTS fails
		err = r.db.Model(&models.Document{}).
			Where("full_text LIKE ?", "%"+query+"%").
			Limit(limit).
			Pluck("id", &documentIDs).Error
		if err != nil {
			return nil, err
		}
	}

	if len(documentIDs) > 0 {
		// Get documents
		r.db.Where("id IN ?", documentIDs).Find(&result.Documents)

		// Get images from those documents
		r.db.Where("document_id IN ?", documentIDs).Find(&result.Images)

		result.Total = int64(len(result.Documents))
	}

	return result, nil
}

// ============================================================================
// STATS
// ============================================================================

func (r *Repository) GetStats() (*models.Stats, error) {
	stats := &models.Stats{}

	r.db.Model(&models.Document{}).Count(&stats.TotalDocuments)
	r.db.Model(&models.Image{}).Count(&stats.TotalImages)
	r.db.Model(&models.Image{}).Where("has_gps = ?", true).Count(&stats.ImagesWithGPS)
	r.db.Model(&models.Image{}).Where("date_taken IS NOT NULL AND date_taken != ''").Count(&stats.ImagesWithDate)

	var totalSize int64
	r.db.Model(&models.Image{}).Select("COALESCE(SUM(size_bytes), 0)").Scan(&totalSize)
	stats.TotalSizeBytes = totalSize

	return stats, nil
}

// ============================================================================
// CURSOR HELPERS
// ============================================================================

func encodeCursor(c models.Cursor) string {
	data, _ := json.Marshal(c)
	return base64.URLEncoding.EncodeToString(data)
}

func decodeCursor(s string) (*models.Cursor, error) {
	data, err := base64.URLEncoding.DecodeString(s)
	if err != nil {
		return nil, err
	}
	var c models.Cursor
	err = json.Unmarshal(data, &c)
	return &c, err
}
