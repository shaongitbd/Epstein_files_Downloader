"""
Database Population Script

Populates SQLite database with document and image metadata.
- Skips already processed documents
- Uses CDN URL mapping from upload script
- Batch inserts for performance
- Resume capability
- Detailed error logging
"""

import json
import sqlite3
import time
import logging
import re
from pathlib import Path
from datetime import datetime
from tqdm import tqdm
from typing import Optional

import config

# ============================================================================
# LOGGING SETUP
# ============================================================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(config.PROJECT_ROOT / "db_populate.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

error_logger = logging.getLogger("errors")
error_handler = logging.FileHandler(config.PROJECT_ROOT / "db_populate_errors.log")
error_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
error_logger.addHandler(error_handler)

# ============================================================================
# DATABASE SETUP
# ============================================================================

def init_database():
    """Initialize the main archive database - tables created by Go backend"""
    config.DATA_DIR.mkdir(parents=True, exist_ok=True)

    # Check if database exists and has tables (created by Go backend)
    if not config.DATABASE_PATH.exists():
        logger.error("Database not found. Please start the Go backend first to create tables.")
        logger.error(f"Expected: {config.DATABASE_PATH}")
        logger.error("Run: cd backend && go run cmd/server/main.go")
        return False

    conn = sqlite3.connect(config.DATABASE_PATH)
    cursor = conn.cursor()

    # Verify tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='documents'")
    if not cursor.fetchone():
        conn.close()
        logger.error("Tables not found. Please start the Go backend first to create tables.")
        return False

    conn.close()
    logger.info(f"Database found at {config.DATABASE_PATH}")
    return True


def get_existing_documents() -> set:
    """Get set of document IDs already in database"""
    conn = sqlite3.connect(config.DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM documents')
    ids = {row[0] for row in cursor.fetchall()}
    conn.close()
    return ids


def get_db_stats() -> dict:
    """Get database statistics"""
    conn = sqlite3.connect(config.DATABASE_PATH)
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) FROM documents')
    doc_count = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM images')
    img_count = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM images WHERE has_gps = 1')
    gps_count = cursor.fetchone()[0]

    conn.close()

    return {
        "documents": doc_count,
        "images": img_count,
        "images_with_gps": gps_count
    }


# ============================================================================
# DATA LOADING
# ============================================================================

def load_cdn_mapping() -> dict:
    """Load CDN URL mapping from upload script"""
    mapping_file = config.DATA_DIR / "cdn_mapping.json"

    if not mapping_file.exists():
        logger.warning("CDN mapping file not found. Run upload_to_cdn.py export first.")
        return {}

    with open(mapping_file, 'r') as f:
        return json.load(f)


def sanitize_text(text: str) -> str:
    """Sanitize text for database storage"""
    if not text:
        return ""
    # Remove null bytes and control characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text


def load_document_data(pdf_name: str, cdn_mapping: dict) -> Optional[dict]:
    """Load all data for a single document"""
    try:
        # Load text data
        text_file = config.EXTRACTED_TEXT / f"{pdf_name}.json"
        text_data = {"pages": [], "full_text": "", "page_count": 0}

        if text_file.exists():
            with open(text_file, 'r', encoding='utf-8') as f:
                text_data = json.load(f)

        # Load image metadata
        images_dir = config.EXTRACTED_IMAGES / pdf_name
        metadata_file = images_dir / "metadata.json"

        images = []
        if metadata_file.exists():
            with open(metadata_file, 'r', encoding='utf-8') as f:
                img_metadata = json.load(f)

            for img_info in img_metadata.get("images", []):
                img_filename = img_info.get("filename", "")
                local_path = str(images_dir / img_filename)

                # Get CDN URL from mapping
                cdn_url = cdn_mapping.get(local_path, "")

                # Get page text
                page_num = img_info.get("page", 1)
                page_text = ""
                for page in text_data.get("pages", []):
                    if page.get("page") == page_num:
                        page_text = sanitize_text(page.get("text", ""))
                        break

                # Extract EXIF data
                metadata = img_info.get("metadata", {})
                combined_exif = metadata.get("combined_exif", {})

                # Check for GPS
                has_gps = bool(
                    "GPSInfo" in combined_exif or
                    any("GPS" in k for k in combined_exif.keys())
                )

                # Get date taken
                date_taken = combined_exif.get(
                    "DateTimeOriginal",
                    combined_exif.get("DateTime", "")
                )

                images.append({
                    "page": page_num,
                    "filename": img_filename,
                    "cdn_url": cdn_url,
                    "width": img_info.get("width", 0),
                    "height": img_info.get("height", 0),
                    "size_bytes": img_info.get("size_bytes", 0),
                    "format": metadata.get("image_info", {}).get("format", ""),
                    "exif": json.dumps(combined_exif) if combined_exif else None,
                    "has_gps": has_gps,
                    "date_taken": date_taken,
                    "page_text": page_text
                })

        return {
            "id": pdf_name,
            "filename": f"{pdf_name}.pdf",
            "page_count": text_data.get("page_count", 0),
            "full_text": sanitize_text(text_data.get("full_text", "")),
            "images": images
        }

    except Exception as e:
        error_logger.error(f"Error loading {pdf_name}: {e}")
        return None


# ============================================================================
# DATABASE INSERTION
# ============================================================================

def insert_documents_batch(documents: list):
    """Insert a batch of documents into the database"""
    if not documents:
        return 0, 0

    conn = sqlite3.connect(config.DATABASE_PATH)
    cursor = conn.cursor()

    doc_count = 0
    img_count = 0

    try:
        for doc in documents:
            # Insert document
            cursor.execute('''
                INSERT OR REPLACE INTO documents (id, filename, page_count, full_text, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', (
                doc["id"],
                doc["filename"],
                doc["page_count"],
                doc["full_text"]
            ))
            doc_count += 1

            # Insert images
            for img in doc.get("images", []):
                cursor.execute('''
                    INSERT INTO images (
                        document_id, page, filename, cdn_url, width, height,
                        size_bytes, format, exif, has_gps, date_taken, page_text
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    doc["id"],
                    img["page"],
                    img["filename"],
                    img["cdn_url"],
                    img["width"],
                    img["height"],
                    img["size_bytes"],
                    img["format"],
                    img["exif"],
                    1 if img["has_gps"] else 0,
                    img["date_taken"],
                    img["page_text"]
                ))
                img_count += 1

        conn.commit()

    except Exception as e:
        conn.rollback()
        error_logger.error(f"Batch insert error: {e}")
        raise

    finally:
        conn.close()

    return doc_count, img_count


# ============================================================================
# MAIN
# ============================================================================

def main():
    logger.info("=" * 60)
    logger.info("Database Population Script")
    logger.info("=" * 60)

    # Check database exists (created by Go backend)
    if not init_database():
        return

    # Load CDN mapping
    logger.info("Loading CDN URL mapping...")
    cdn_mapping = load_cdn_mapping()
    logger.info(f"Loaded {len(cdn_mapping):,} CDN URLs")

    # Get existing documents
    logger.info("Checking existing documents...")
    existing_docs = get_existing_documents()
    logger.info(f"Already in database: {len(existing_docs):,} documents")

    # Collect documents to process
    logger.info("Scanning for documents to process...")

    to_process = []

    # Check extracted_images for folders
    if config.EXTRACTED_IMAGES.exists():
        for pdf_folder in config.EXTRACTED_IMAGES.iterdir():
            if pdf_folder.is_dir():
                pdf_name = pdf_folder.name
                if pdf_name not in existing_docs:
                    to_process.append(pdf_name)

    # Also check extracted_text for documents without images
    if config.EXTRACTED_TEXT.exists():
        for text_file in config.EXTRACTED_TEXT.glob("*.json"):
            pdf_name = text_file.stem
            if pdf_name not in existing_docs and pdf_name not in to_process:
                to_process.append(pdf_name)

    to_process.sort()

    logger.info(f"Documents to process: {len(to_process):,}")

    if not to_process:
        logger.info("No new documents to process. All done!")
        stats = get_db_stats()
        logger.info(f"Database stats: {stats}")
        return

    # Process documents in batches
    start_time = time.time()
    total_docs = 0
    total_imgs = 0
    failed = 0

    batch = []
    batch_size = config.DB_BATCH_SIZE

    with tqdm(total=len(to_process), desc="Processing", unit="doc") as pbar:
        for pdf_name in to_process:
            doc_data = load_document_data(pdf_name, cdn_mapping)

            if doc_data:
                batch.append(doc_data)

                if len(batch) >= batch_size:
                    try:
                        docs, imgs = insert_documents_batch(batch)
                        total_docs += docs
                        total_imgs += imgs
                    except Exception as e:
                        failed += len(batch)
                        logger.error(f"Batch insert failed: {e}")
                    batch = []
            else:
                failed += 1

            pbar.update(1)
            pbar.set_postfix({"docs": total_docs, "imgs": total_imgs, "failed": failed})

        # Insert remaining batch
        if batch:
            try:
                docs, imgs = insert_documents_batch(batch)
                total_docs += docs
                total_imgs += imgs
            except Exception as e:
                failed += len(batch)
                logger.error(f"Final batch insert failed: {e}")

    elapsed = time.time() - start_time

    logger.info("")
    logger.info("=" * 60)
    logger.info("POPULATION COMPLETE")
    logger.info("=" * 60)
    logger.info(f"Time elapsed: {elapsed / 60:.1f} minutes")
    logger.info(f"Documents inserted: {total_docs:,}")
    logger.info(f"Images inserted: {total_imgs:,}")
    logger.info(f"Failed: {failed:,}")
    logger.info(f"Speed: {total_docs / elapsed:.1f} docs/sec")

    # Final stats
    stats = get_db_stats()
    logger.info("")
    logger.info("Final database stats:")
    logger.info(f"  Total documents: {stats['documents']:,}")
    logger.info(f"  Total images: {stats['images']:,}")
    logger.info(f"  Images with GPS: {stats['images_with_gps']:,}")


def rebuild_fts():
    """Rebuild the FTS index from scratch"""
    logger.info("Rebuilding FTS index...")

    conn = sqlite3.connect(config.DATABASE_PATH)
    cursor = conn.cursor()

    # Drop and recreate FTS table
    cursor.execute('DROP TABLE IF EXISTS documents_fts')
    cursor.execute('''
        CREATE VIRTUAL TABLE documents_fts USING fts5(
            document_id,
            full_text,
            content='documents',
            content_rowid='rowid'
        )
    ''')

    # Populate FTS from documents
    cursor.execute('''
        INSERT INTO documents_fts(document_id, full_text)
        SELECT id, full_text FROM documents WHERE full_text IS NOT NULL AND full_text != ''
    ''')

    conn.commit()
    conn.close()

    logger.info("FTS index rebuilt successfully")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "rebuild-fts":
        rebuild_fts()
    else:
        main()
