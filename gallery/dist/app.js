/**
 * EPSTEIN FILES ARCHIVE — Gallery Application
 * ═══════════════════════════════════════════════════════════════════
 */

class ArchiveGallery {
    constructor() {
        this.data = null;
        this.filteredImages = [];
        this.searchIndex = null;
        this.currentFilter = 'all';
        this.currentView = 'grid';
        this.currentImageIndex = 0;
        this.searchQuery = '';
        this.searchResults = null;

        this.init();
    }

    async init() {
        this.bindElements();
        this.bindEvents();
        await this.loadData();
        this.buildSearchIndex();
        this.render();
    }

    bindElements() {
        // Stats
        this.totalDocsEl = document.getElementById('total-docs');
        this.totalImagesEl = document.getElementById('total-images');
        this.gpsCountEl = document.getElementById('gps-count');

        // Search & Filters
        this.searchInput = document.getElementById('search-input');
        this.filterBtns = document.querySelectorAll('.filter-btn');
        this.viewBtns = document.querySelectorAll('.view-btn');

        // Gallery
        this.gallery = document.getElementById('gallery');
        this.loadingEl = document.getElementById('loading');
        this.noResultsEl = document.getElementById('no-results');
        this.resultsCountEl = document.getElementById('results-count');

        // Modal
        this.modal = document.getElementById('modal');
        this.modalImage = document.getElementById('modal-image');
        this.modalClose = document.getElementById('modal-close');
        this.modalBackdrop = document.querySelector('.modal-backdrop');
        this.prevBtn = document.getElementById('prev-btn');
        this.nextBtn = document.getElementById('next-btn');
        this.imageCounter = document.getElementById('image-counter');
        this.tabBtns = document.querySelectorAll('.tab-btn');

        // Footer
        this.generatedDateEl = document.getElementById('generated-date');
    }

    bindEvents() {
        // Search
        this.searchInput.addEventListener('input', this.debounce(() => {
            this.searchQuery = this.searchInput.value.trim();
            this.performSearch();
        }, 300));

        // Keyboard shortcut for search
        document.addEventListener('keydown', (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                this.searchInput.focus();
            }
            if (e.key === 'Escape') {
                if (this.modal.classList.contains('active')) {
                    this.closeModal();
                }
            }
            if (this.modal.classList.contains('active')) {
                if (e.key === 'ArrowLeft') this.navigateImage(-1);
                if (e.key === 'ArrowRight') this.navigateImage(1);
            }
        });

        // Filters
        this.filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentFilter = btn.dataset.filter;
                this.applyFilters();
            });
        });

        // View toggles
        this.viewBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.viewBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentView = btn.dataset.view;
                this.gallery.classList.toggle('list-view', this.currentView === 'list');
            });
        });

        // Modal
        this.modalClose.addEventListener('click', () => this.closeModal());
        this.modalBackdrop.addEventListener('click', () => this.closeModal());
        this.prevBtn.addEventListener('click', () => this.navigateImage(-1));
        this.nextBtn.addEventListener('click', () => this.navigateImage(1));

        // Tabs
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');
            });
        });
    }

    async loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error('Data not found');
            this.data = await response.json();

            // Update stats
            this.totalDocsEl.textContent = this.formatNumber(this.data.stats.total_documents);
            this.totalImagesEl.textContent = this.formatNumber(this.data.stats.total_images);
            this.gpsCountEl.textContent = this.formatNumber(this.data.stats.images_with_gps);

            // Set generated date
            if (this.data.generated) {
                const date = new Date(this.data.generated);
                this.generatedDateEl.textContent = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            this.filteredImages = [...this.data.images];
        } catch (error) {
            console.error('Failed to load data:', error);
            this.showError('Failed to load archive data. Please run build_gallery.py first.');
        }
    }

    buildSearchIndex() {
        if (!this.data || !this.data.images.length) return;

        this.searchIndex = lunr(function() {
            this.ref('id');
            this.field('pdf', { boost: 10 });
            this.field('text');

            // Disable stemming for better exact matches
            this.pipeline.remove(lunr.stemmer);
            this.searchPipeline.remove(lunr.stemmer);

            this.data.images.forEach(img => {
                this.add({
                    id: img.id,
                    pdf: img.pdf,
                    text: img.text || ''
                });
            });
        }.bind({ data: this.data }));
    }

    performSearch() {
        if (!this.searchQuery) {
            this.searchResults = null;
            this.applyFilters();
            return;
        }

        if (!this.searchIndex) return;

        try {
            // Search with wildcards for partial matching
            const results = this.searchIndex.search(`*${this.searchQuery}*`);
            const resultIds = new Set(results.map(r => r.ref));
            this.searchResults = resultIds;
        } catch (e) {
            // Fallback to simple search if lunr query fails
            const query = this.searchQuery.toLowerCase();
            this.searchResults = new Set(
                this.data.images
                    .filter(img =>
                        img.pdf.toLowerCase().includes(query) ||
                        (img.text && img.text.toLowerCase().includes(query))
                    )
                    .map(img => img.id)
            );
        }

        this.applyFilters();
    }

    applyFilters() {
        if (!this.data) return;

        let images = [...this.data.images];

        // Apply search filter
        if (this.searchResults) {
            images = images.filter(img => this.searchResults.has(img.id));
        }

        // Apply category filter
        switch (this.currentFilter) {
            case 'has-gps':
                images = images.filter(img => img.has_gps);
                break;
            case 'has-date':
                images = images.filter(img => img.date);
                break;
            case 'has-text':
                images = images.filter(img => img.text && img.text.trim().length > 0);
                break;
        }

        this.filteredImages = images;
        this.render();
    }

    render() {
        this.loadingEl.style.display = 'none';

        if (!this.data || this.filteredImages.length === 0) {
            this.gallery.innerHTML = '';
            this.noResultsEl.style.display = 'block';
            this.resultsCountEl.textContent = 'No results found';
            return;
        }

        this.noResultsEl.style.display = 'none';
        this.resultsCountEl.textContent = `Showing ${this.formatNumber(this.filteredImages.length)} images`;

        // Render gallery items with staggered animation
        this.gallery.innerHTML = this.filteredImages.map((img, index) => `
            <article class="gallery-item" data-id="${img.id}" data-index="${index}" style="animation-delay: ${Math.min(index * 30, 500)}ms">
                <div class="item-image-container">
                    <img class="item-image" src="${img.path}" alt="${img.pdf}" loading="lazy">
                    <div class="item-overlay">
                        <div class="item-overlay-text">${this.escapeHtml(img.text?.substring(0, 200) || '')}</div>
                    </div>
                </div>
                <div class="item-info">
                    <div class="item-doc-id">${img.pdf}</div>
                    <div class="item-meta">
                        <span>PAGE ${img.page}</span>
                        <span>${img.width}×${img.height}</span>
                        <span>${this.formatFileSize(img.size)}</span>
                    </div>
                    <div class="item-badges">
                        ${img.has_gps ? '<span class="item-badge gps">GPS</span>' : ''}
                        ${img.date ? '<span class="item-badge dated">DATED</span>' : ''}
                    </div>
                </div>
            </article>
        `).join('');

        // Bind click events
        this.gallery.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.openModal(index);
            });
        });
    }

    openModal(index) {
        this.currentImageIndex = index;
        this.updateModalContent();
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    navigateImage(direction) {
        const newIndex = this.currentImageIndex + direction;
        if (newIndex >= 0 && newIndex < this.filteredImages.length) {
            this.currentImageIndex = newIndex;
            this.updateModalContent();
        }
    }

    updateModalContent() {
        const img = this.filteredImages[this.currentImageIndex];
        if (!img) return;

        // Update image
        this.modalImage.src = img.path;
        this.modalImage.alt = img.pdf;

        // Update header
        document.getElementById('modal-doc-id').textContent = img.pdf;
        document.getElementById('modal-page').textContent = img.page;

        // Update navigation
        this.imageCounter.textContent = `${this.currentImageIndex + 1} / ${this.filteredImages.length}`;
        this.prevBtn.disabled = this.currentImageIndex === 0;
        this.nextBtn.disabled = this.currentImageIndex === this.filteredImages.length - 1;

        // Update metadata
        document.getElementById('meta-filename').textContent = img.filename;
        document.getElementById('meta-dimensions').textContent = `${img.width} × ${img.height} px`;
        document.getElementById('meta-size').textContent = this.formatFileSize(img.size);
        document.getElementById('meta-format').textContent = img.format || '—';
        document.getElementById('meta-camera').textContent = img.camera || '—';
        document.getElementById('meta-date').textContent = img.date || '—';

        // GPS Section
        const gpsSection = document.getElementById('gps-section');
        const gpsData = document.getElementById('gps-data');
        if (img.has_gps && img.exif) {
            gpsSection.style.display = 'block';
            const gpsInfo = Object.entries(img.exif)
                .filter(([k]) => k.includes('GPS'))
                .map(([k, v]) => `${k}: ${v}`)
                .join('\n');
            gpsData.textContent = gpsInfo || 'GPS data present';
        } else {
            gpsSection.style.display = 'none';
        }

        // Text content
        const textContent = document.getElementById('modal-text');
        if (img.text && img.text.trim()) {
            let displayText = img.text;
            // Highlight search terms
            if (this.searchQuery) {
                const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi');
                displayText = this.escapeHtml(displayText).replace(regex, '<span class="highlight">$1</span>');
                textContent.innerHTML = displayText;
            } else {
                textContent.textContent = displayText;
            }
        } else {
            textContent.innerHTML = '<p class="no-text">No text extracted from this page.</p>';
        }

        // EXIF content
        const exifContent = document.getElementById('modal-exif');
        if (img.exif && Object.keys(img.exif).length > 0) {
            exifContent.innerHTML = Object.entries(img.exif)
                .map(([key, value]) => `
                    <div class="exif-item">
                        <span class="exif-key">${this.escapeHtml(key)}</span>
                        <span class="exif-value">${this.escapeHtml(String(value))}</span>
                    </div>
                `).join('');
        } else {
            exifContent.innerHTML = '<p class="no-text">No EXIF data available.</p>';
        }
    }

    // Utilities
    formatNumber(num) {
        return num?.toLocaleString() || '0';
    }

    formatFileSize(bytes) {
        if (!bytes) return '—';
        const units = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(1)} ${units[i]}`;
    }

    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    debounce(fn, delay) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    showError(message) {
        this.loadingEl.style.display = 'none';
        this.noResultsEl.style.display = 'block';
        this.noResultsEl.querySelector('h3').textContent = 'ERROR';
        this.noResultsEl.querySelector('p').textContent = message;
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.archive = new ArchiveGallery();
});
