# Epstein Files Archive

Document image archive viewer for DOJ Epstein Files.

## Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Next.js        │─────▶│  Go Backend     │─────▶│  SQLite + FTS5  │
│  Frontend       │ API  │  (Gin + GORM)   │      │                 │
└─────────────────┘      └─────────────────┘      └────────┬────────┘
        │                                                   │
        │ images                                            │
        ▼                                                   │
┌─────────────────┐                                         │
│   BunnyCDN      │◀────────────────────────────────────────┘
│   (Storage)     │
└─────────────────┘
        ▲
        │ direct upload
┌───────┴───────┐
│    Python     │──────▶ SQLite (direct file access)
│    Scripts    │
└───────────────┘
```

## Quick Start

### 1. Configure Environment

Edit `.env` with your credentials:
- DOJ cookies (for downloading)
- BunnyCDN credentials (for image hosting)

### 2. Download & Extract PDFs

```bash
python download_epstein_files.py
python extract_pdf_content.py
```

### 3. Upload Images & Populate Database

```bash
cd scripts
python upload_to_cdn.py         # Upload to BunnyCDN
python upload_to_cdn.py export  # Export URL mapping
python populate_db.py           # Populate SQLite
```

### 4. Start Backend (use WSL on Windows)

```bash
cd backend
go run cmd/server/main.go
```

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/images` | Paginated images |
| `GET /api/images/:id` | Image details |
| `GET /api/documents` | Paginated documents |
| `GET /api/documents/:id` | Document with images |
| `GET /api/search?q=` | Full-text search |
| `GET /api/stats` | Archive statistics |

### Query Parameters

- `cursor` - Pagination cursor
- `limit` - Items per page (max 100)
- `has_gps` - Filter by GPS data
- `has_date` - Filter by date taken
- `has_text` - Filter by extracted text

## Python Scripts

### upload_to_cdn.py
- Parallel uploads to BunnyCDN
- **Skips already uploaded** files
- Retry with exponential backoff
- Progress tracking in SQLite
- Resume capability

### populate_db.py
- **Skips already processed** documents
- Batch inserts for performance
- FTS5 full-text search index
- Resume capability

## Tech Stack

- **Backend**: Go + Gin + GORM
- **Database**: SQLite + FTS5
- **Frontend**: Next.js 14 + Tailwind CSS
- **Storage**: BunnyCDN
- **Scripts**: Python (asyncio + aiohttp)
