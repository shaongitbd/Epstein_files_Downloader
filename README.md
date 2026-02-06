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
- BunnyCDN credentials (for image hosting)

DOJ cookies are **automatically harvested** via headless browser (see below). Manual `.env` cookies are only needed as fallback.

### 1.5. Install Browser for Cookie Harvesting

The Python downloader automatically obtains DOJ cookies using a headless browser. Install one of:

```bash
# Recommended (better anti-detection)
pip install patchright && patchright install chromium

# On Linux, install system dependencies
patchright install-deps chromium

# Alternative
pip install playwright && playwright install chromium
```

### 2. Download PDFs

**Option A: Go Downloader (Recommended - Fast)**

```bash
cd downloader
./downloader.exe -d "files/DataSet 2/" -s 3159 -e 3857
```

**Option B: Python Downloader**

```bash
python download_epstein_files.py -s 3159 -e 3857 -d "files/DataSet%202/"
```

### 3. Extract PDF Content

```bash
python extract_pdf_content.py
```

### 4. Upload Images & Populate Database

```bash
cd scripts
python upload_to_cdn.py         # Upload to BunnyCDN
python upload_to_cdn.py export  # Export URL mapping
python populate_db.py           # Populate SQLite
```

### 5. Start Backend (use WSL on Windows)

```bash
cd backend
go run cmd/server/main.go
```

### 6. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

## Go Downloader

Fast parallel downloader written in Go with 100 concurrent connections.

### Usage

```bash
./downloader.exe [options]

Options:
  -d string    Dataset path (default "files/DataSet%201/")
  -s int       Start file number (default 1)
  -e int       End file number (default 2731783)
  -o string    Output directory (default "../downloads")
  -c int       Concurrent downloads (default 100)
  -v           Verbose output (show each file)
```

### Examples

```bash
# Download DataSet 1, files 1-1000
./downloader.exe -s 1 -e 1000

# Download DataSet 2, specific range
./downloader.exe -d "files/DataSet 2/" -s 3159 -e 3857

# Verbose mode (see each file)
./downloader.exe -d "files/DataSet 2/" -s 3159 -e 3857 -v

# Custom output directory
./downloader.exe -s 1 -e 100 -o "/path/to/downloads"

# More concurrency
./downloader.exe -s 1 -e 1000 -c 200
```

### Building

Requires Go 1.21+

**Build for current OS:**
```bash
cd downloader
go build -o downloader .
```

**Cross-compile for Windows (from WSL/Linux):**
```bash
cd downloader
GOOS=windows GOARCH=amd64 go build -o downloader.exe .
```

**Cross-compile for Linux (from Windows WSL):**
```bash
wsl -e bash -c "cd /mnt/j/p/Projects/esptein_files/downloader && GOOS=linux GOARCH=amd64 go build -o downloader-linux ."
```

**Cross-compile for macOS:**
```bash
GOOS=darwin GOARCH=amd64 go build -o downloader-mac .
```

### Environment

The downloader reads cookies from `.env` file (searches current dir, parent, grandparent):

```env
DOJ_COOKIE_AK_BMSC=your_cookie_value
DOJ_COOKIE_QUEUE_IT=your_queue_cookie
```

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

### download_epstein_files.py
- **Automatic cookie harvesting** via headless browser (patchright/playwright)
- Async parallel downloads
- Range support (`-s`, `-e`, `-d` flags)
- Retry with exponential backoff
- Resume capability
- Proxy rotation support

#### Proxy Support

To avoid getting blocked, the downloader supports rotating proxies loaded from `proxies.txt`.

**Setup:** Create a `proxies.txt` file in the project root (one proxy per line):

```
http://user:pass@191.101.41.41:6113
http://user:pass@192.168.1.50:8080
http://user:pass@10.0.0.1:3128
# lines starting with # are skipped
```

**How it works:**
- Proxies are split into chunks (default 50)
- Each download batch rotates to a fresh chunk of proxies
- Within a chunk, 30 concurrent downloads round-robin across the 50 proxies
- On retries, a different proxy from the chunk is used
- If `proxies.txt` doesn't exist, downloads proceed directly without proxies

**Usage:**

```bash
# Uses proxies.txt with default chunk size of 50
python download_epstein_files.py -s 1 -e 1000

# Custom proxy chunk size (use 100 proxies per rotation)
python download_epstein_files.py -s 1 -e 1000 --proxy-chunk 100
```

**CLI options:**

```
-s, --start         Start file number (default: 1)
-e, --end           End file number (default: 2731783)
-d, --dataset       Dataset path (default: files/DataSet%201/)
    --proxy-chunk   Proxies per rotation chunk (default: 50)
    --no-browser    Skip browser cookie harvest, use .env cookies only
    --show-browser  Show browser window during cookie harvest (for debugging)
```

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
- **Frontend**: Next.js + Tailwind CSS
- **Storage**: BunnyCDN
- **Downloader**: Go (fast) / Python (async)
- **Scripts**: Python (asyncio + aiohttp)

## Deployment

### Heroku

Both frontend and backend support Heroku deployment using the monorepo buildpack.

**Backend:**
1. Add buildpacks: `heroku-buildpack-monorepo` + `heroku/go`
2. Set config: `APP_BASE=backend`

**Frontend:**
1. Add buildpacks: `heroku-buildpack-monorepo` + `heroku/nodejs`
2. Set config: `APP_BASE=frontend`, `NEXT_PUBLIC_API_URL=https://your-backend.herokuapp.com`
