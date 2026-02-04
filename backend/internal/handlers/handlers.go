package handlers

import (
	"net/http"
	"strconv"

	"github.com/epstein-files/backend/internal/repository"
	"github.com/gin-gonic/gin"
)

type Handlers struct {
	repo *repository.Repository
}

func New(repo *repository.Repository) *Handlers {
	return &Handlers{repo: repo}
}

// ============================================================================
// IMAGES
// ============================================================================

// GetImages returns paginated images with optional filters
// GET /api/images?cursor=xxx&limit=50&has_gps=true&has_date=true&has_text=true&document_id=xxx
func (h *Handlers) GetImages(c *gin.Context) {
	cursor := c.Query("cursor")
	limit := getIntParam(c, "limit", 50)
	if limit > 100 {
		limit = 100
	}

	filters := repository.ImageFilters{
		DocumentID: c.Query("document_id"),
	}

	if hasGPS := c.Query("has_gps"); hasGPS == "true" {
		val := true
		filters.HasGPS = &val
	}
	if hasDate := c.Query("has_date"); hasDate == "true" {
		val := true
		filters.HasDate = &val
	}
	if hasText := c.Query("has_text"); hasText == "true" {
		val := true
		filters.HasText = &val
	}

	result, err := h.repo.GetImages(cursor, limit, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetImageByID returns a single image with full details
// GET /api/images/:id
func (h *Handlers) GetImageByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid image ID"})
		return
	}

	image, err := h.repo.GetImageByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Image not found"})
		return
	}

	c.JSON(http.StatusOK, image)
}

// ============================================================================
// DOCUMENTS
// ============================================================================

// GetDocuments returns paginated documents
// GET /api/documents?cursor=xxx&limit=50
func (h *Handlers) GetDocuments(c *gin.Context) {
	cursor := c.Query("cursor")
	limit := getIntParam(c, "limit", 50)
	if limit > 100 {
		limit = 100
	}

	result, err := h.repo.GetDocuments(cursor, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetDocumentByID returns a single document with all its images
// GET /api/documents/:id
func (h *Handlers) GetDocumentByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid document ID"})
		return
	}

	document, err := h.repo.GetDocumentByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Document not found"})
		return
	}

	c.JSON(http.StatusOK, document)
}

// ============================================================================
// SEARCH
// ============================================================================

// Search performs full-text search
// GET /api/search?q=search+query&limit=50
func (h *Handlers) Search(c *gin.Context) {
	query := c.Query("q")
	limit := getIntParam(c, "limit", 50)
	if limit > 100 {
		limit = 100
	}

	result, err := h.repo.Search(query, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// ============================================================================
// STATS
// ============================================================================

// GetStats returns archive statistics
// GET /api/stats
func (h *Handlers) GetStats(c *gin.Context) {
	stats, err := h.repo.GetStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// ============================================================================
// HEALTH
// ============================================================================

// Health check endpoint
// GET /api/health
func (h *Handlers) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"service": "epstein-files-api",
	})
}

// ============================================================================
// HELPERS
// ============================================================================

func getIntParam(c *gin.Context, key string, defaultVal int) int {
	val := c.Query(key)
	if val == "" {
		return defaultVal
	}
	i, err := strconv.Atoi(val)
	if err != nil {
		return defaultVal
	}
	return i
}
