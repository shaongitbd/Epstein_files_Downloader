"""
BunnyCDN Image Uploader

Uploads extracted images to BunnyCDN with:
- Skip logic for already uploaded files
- Retry with exponential backoff
- Progress checkpointing
- Detailed error logging
- Parallel uploads
"""

import asyncio
import aiohttp
import aiofiles
import json
import sqlite3
import time
import logging
import hashlib
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Optional
from tqdm import tqdm

import config

# ============================================================================
# LOGGING SETUP
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(config.PROJECT_ROOT / "cdn_upload.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Separate error log
error_logger = logging.getLogger("errors")
error_handler = logging.FileHandler(config.PROJECT_ROOT / "cdn_upload_errors.log")
error_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
error_logger.addHandler(error_handler)

# ============================================================================
# TRACKING DATABASE
# ============================================================================

TRACKING_DB = config.DATA_DIR / "upload_tracking.db"


def init_tracking_db():
    """Initialize SQLite database for tracking uploads"""
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(TRACKING_DB)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            local_path TEXT UNIQUE NOT NULL,
            cdn_path TEXT NOT NULL,
            cdn_url TEXT NOT NULL,
            file_hash TEXT,
            size_bytes INTEGER,
            status TEXT DEFAULT 'pending',
            attempts INTEGER DEFAULT 0,
            last_error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            uploaded_at TIMESTAMP
        )
    ''')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_local_path ON uploads(local_path)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_status ON uploads(status)')

    conn.commit()
    conn.close()


def get_upload_status(local_path: str) -> Optional[dict]:
    """Check if a file has been uploaded"""
    conn = sqlite3.connect(TRACKING_DB)
    cursor = conn.cursor()
    cursor.execute(
        'SELECT status, cdn_url, attempts, last_error FROM uploads WHERE local_path = ?',
        (local_path,)
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "status": row[0],
            "cdn_url": row[1],
            "attempts": row[2],
            "last_error": row[3]
        }
    return None


def mark_upload_pending(local_path: str, cdn_path: str, cdn_url: str, size_bytes: int, file_hash: str):
    """Mark a file as pending upload"""
    conn = sqlite3.connect(TRACKING_DB)
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO uploads (local_path, cdn_path, cdn_url, size_bytes, file_hash, status, attempts)
        VALUES (?, ?, ?, ?, ?, 'pending', 0)
    ''', (local_path, cdn_path, cdn_url, size_bytes, file_hash))
    conn.commit()
    conn.close()


def mark_upload_success(local_path: str):
    """Mark a file as successfully uploaded"""
    conn = sqlite3.connect(TRACKING_DB)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE uploads SET status = 'success', uploaded_at = CURRENT_TIMESTAMP
        WHERE local_path = ?
    ''', (local_path,))
    conn.commit()
    conn.close()


def mark_upload_failed(local_path: str, error: str, attempts: int):
    """Mark a file as failed"""
    conn = sqlite3.connect(TRACKING_DB)
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE uploads SET status = 'failed', last_error = ?, attempts = ?
        WHERE local_path = ?
    ''', (error, attempts, local_path))
    conn.commit()
    conn.close()


def get_pending_uploads() -> list:
    """Get all pending or failed uploads for retry"""
    conn = sqlite3.connect(TRACKING_DB)
    cursor = conn.cursor()
    cursor.execute('''
        SELECT local_path, cdn_path, cdn_url, attempts
        FROM uploads
        WHERE status IN ('pending', 'failed') AND attempts < ?
    ''', (config.MAX_RETRIES,))
    rows = cursor.fetchall()
    conn.close()
    return [{"local_path": r[0], "cdn_path": r[1], "cdn_url": r[2], "attempts": r[3]} for r in rows]


def get_successful_uploads() -> dict:
    """Get mapping of local paths to CDN URLs for successful uploads"""
    conn = sqlite3.connect(TRACKING_DB)
    cursor = conn.cursor()
    cursor.execute('SELECT local_path, cdn_url FROM uploads WHERE status = ?', ('success',))
    rows = cursor.fetchall()
    conn.close()
    return {r[0]: r[1] for r in rows}


def get_upload_stats() -> dict:
    """Get upload statistics"""
    conn = sqlite3.connect(TRACKING_DB)
    cursor = conn.cursor()

    stats = {}
    for status in ['pending', 'success', 'failed']:
        cursor.execute('SELECT COUNT(*) FROM uploads WHERE status = ?', (status,))
        stats[status] = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM uploads')
    stats['total'] = cursor.fetchone()[0]

    conn.close()
    return stats


# ============================================================================
# FILE UTILITIES
# ============================================================================

def get_file_hash(filepath: Path) -> str:
    """Calculate MD5 hash of a file"""
    hash_md5 = hashlib.md5()
    with open(filepath, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()


def collect_files_to_upload() -> list:
    """Collect all image files that need to be uploaded"""
    files = []

    if not config.EXTRACTED_IMAGES.exists():
        logger.error(f"Extracted images directory not found: {config.EXTRACTED_IMAGES}")
        return files

    # Get already successful uploads
    successful = get_successful_uploads()

    for pdf_folder in config.EXTRACTED_IMAGES.iterdir():
        if not pdf_folder.is_dir():
            continue

        pdf_name = pdf_folder.name

        for img_file in pdf_folder.glob("*"):
            if img_file.suffix.lower() in ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff']:
                local_path = str(img_file)

                # Skip if already successfully uploaded
                if local_path in successful:
                    continue

                cdn_path = f"images/{pdf_name}/{img_file.name}"
                cdn_url = config.get_cdn_url(cdn_path)

                files.append({
                    "local_path": local_path,
                    "cdn_path": cdn_path,
                    "cdn_url": cdn_url,
                    "size_bytes": img_file.stat().st_size
                })

    return files


# ============================================================================
# BUNNYCDN UPLOAD
# ============================================================================

@dataclass
class UploadResult:
    local_path: str
    cdn_url: str
    success: bool
    error: Optional[str] = None
    attempts: int = 1


async def upload_file(
    session: aiohttp.ClientSession,
    local_path: str,
    cdn_path: str,
    cdn_url: str,
    semaphore: asyncio.Semaphore,
    attempt: int = 1
) -> UploadResult:
    """Upload a single file to BunnyCDN"""
    async with semaphore:
        url = f"https://{config.BUNNY_STORAGE_HOSTNAME}/{config.BUNNY_STORAGE_ZONE}/{cdn_path}"

        headers = {
            "AccessKey": config.BUNNY_API_KEY,
            "Content-Type": "application/octet-stream"
        }

        for retry in range(config.MAX_RETRIES):
            try:
                async with aiofiles.open(local_path, 'rb') as f:
                    data = await f.read()

                timeout = aiohttp.ClientTimeout(total=config.UPLOAD_TIMEOUT)

                async with session.put(url, data=data, headers=headers, timeout=timeout) as response:
                    if response.status in [200, 201]:
                        mark_upload_success(local_path)
                        return UploadResult(
                            local_path=local_path,
                            cdn_url=cdn_url,
                            success=True,
                            attempts=attempt + retry
                        )
                    else:
                        error_text = await response.text()
                        error = f"HTTP {response.status}: {error_text}"

                        if response.status >= 500:
                            # Server error, retry
                            await asyncio.sleep(config.RETRY_BACKOFF ** retry)
                            continue
                        else:
                            # Client error, don't retry
                            mark_upload_failed(local_path, error, attempt + retry)
                            error_logger.error(f"UPLOAD FAILED: {local_path} - {error}")
                            return UploadResult(
                                local_path=local_path,
                                cdn_url=cdn_url,
                                success=False,
                                error=error,
                                attempts=attempt + retry
                            )

            except asyncio.TimeoutError:
                error = "Upload timeout"
                if retry < config.MAX_RETRIES - 1:
                    await asyncio.sleep(config.RETRY_BACKOFF ** retry)
                    continue
                mark_upload_failed(local_path, error, attempt + retry)
                error_logger.error(f"UPLOAD FAILED: {local_path} - {error}")
                return UploadResult(
                    local_path=local_path,
                    cdn_url=cdn_url,
                    success=False,
                    error=error,
                    attempts=attempt + retry
                )

            except Exception as e:
                error = str(e)
                if retry < config.MAX_RETRIES - 1:
                    await asyncio.sleep(config.RETRY_BACKOFF ** retry)
                    continue
                mark_upload_failed(local_path, error, attempt + retry)
                error_logger.error(f"UPLOAD FAILED: {local_path} - {error}")
                return UploadResult(
                    local_path=local_path,
                    cdn_url=cdn_url,
                    success=False,
                    error=error,
                    attempts=attempt + retry
                )

        # Should not reach here
        return UploadResult(
            local_path=local_path,
            cdn_url=cdn_url,
            success=False,
            error="Max retries exceeded",
            attempts=attempt + config.MAX_RETRIES
        )


async def upload_batch(files: list, pbar: tqdm) -> list:
    """Upload a batch of files concurrently"""
    semaphore = asyncio.Semaphore(config.MAX_CONCURRENT_UPLOADS)

    connector = aiohttp.TCPConnector(limit=config.MAX_CONCURRENT_UPLOADS)
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [
            upload_file(
                session,
                f["local_path"],
                f["cdn_path"],
                f["cdn_url"],
                semaphore,
                f.get("attempts", 0)
            )
            for f in files
        ]

        results = []
        for coro in asyncio.as_completed(tasks):
            result = await coro
            results.append(result)
            pbar.update(1)

            if not result.success:
                pbar.set_postfix({"last_error": result.error[:30] if result.error else ""})

        return results


# ============================================================================
# MAIN
# ============================================================================

async def main():
    logger.info("=" * 60)
    logger.info("BunnyCDN Image Uploader")
    logger.info("=" * 60)

    # Validate configuration
    valid, missing = config.validate_bunny_config()
    if not valid:
        logger.error("Missing BunnyCDN configuration:")
        for m in missing:
            logger.error(f"  - {m}")
        logger.error("Please add these to your .env file")
        return

    # Initialize tracking database
    init_tracking_db()

    # Collect files to upload
    logger.info("Scanning for files to upload...")
    files = collect_files_to_upload()

    # Also get pending/failed from previous runs
    pending = get_pending_uploads()

    # Merge, avoiding duplicates
    existing_paths = {f["local_path"] for f in files}
    for p in pending:
        if p["local_path"] not in existing_paths:
            files.append(p)

    stats = get_upload_stats()
    logger.info(f"Already uploaded: {stats['success']:,}")
    logger.info(f"Pending/Failed: {stats['pending'] + stats['failed']:,}")
    logger.info(f"New files to upload: {len(files):,}")

    if not files:
        logger.info("No files to upload. All done!")
        return

    # Register new files in tracking DB
    logger.info("Registering files in tracking database...")
    for f in files:
        status = get_upload_status(f["local_path"])
        if not status:
            mark_upload_pending(
                f["local_path"],
                f["cdn_path"],
                f["cdn_url"],
                f.get("size_bytes", 0),
                ""  # Skip hash for performance
            )

    # Upload files
    logger.info(f"Starting upload with {config.MAX_CONCURRENT_UPLOADS} concurrent connections...")
    start_time = time.time()

    success_count = 0
    fail_count = 0

    batch_size = 5000
    with tqdm(total=len(files), desc="Uploading", unit="file") as pbar:
        for i in range(0, len(files), batch_size):
            batch = files[i:i + batch_size]
            results = await upload_batch(batch, pbar)

            for r in results:
                if r.success:
                    success_count += 1
                else:
                    fail_count += 1

    elapsed = time.time() - start_time
    logger.info("")
    logger.info("=" * 60)
    logger.info("UPLOAD COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Time elapsed: {elapsed / 60:.1f} minutes")
    logger.info(f"Successful: {success_count:,}")
    logger.info(f"Failed: {fail_count:,}")
    logger.info(f"Speed: {success_count / elapsed:.1f} files/sec")

    if fail_count > 0:
        logger.info("")
        logger.info(f"Check cdn_upload_errors.log for failed upload details")
        logger.info("Run this script again to retry failed uploads")


def export_cdn_mapping(output_path: Path = None):
    """Export successful uploads as JSON mapping for database population"""
    if output_path is None:
        output_path = config.DATA_DIR / "cdn_mapping.json"

    mapping = get_successful_uploads()

    with open(output_path, 'w') as f:
        json.dump(mapping, f, indent=2)

    logger.info(f"Exported {len(mapping)} CDN mappings to {output_path}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "export":
        export_cdn_mapping()
    else:
        asyncio.run(main())
