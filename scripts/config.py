"""
Shared configuration for upload scripts
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Paths
PROJECT_ROOT = Path(__file__).parent.parent
EXTRACTED_IMAGES = PROJECT_ROOT / "extracted_images"
EXTRACTED_TEXT = PROJECT_ROOT / "extracted_text"
DATA_DIR = PROJECT_ROOT / "data"
DATABASE_PATH = DATA_DIR / "archive.db"

# BunnyCDN Configuration
BUNNY_STORAGE_ZONE = os.getenv("BUNNY_STORAGE_ZONE", "")
BUNNY_API_KEY = os.getenv("BUNNY_API_KEY", "")
BUNNY_STORAGE_HOSTNAME = os.getenv("BUNNY_STORAGE_HOSTNAME", "storage.bunnycdn.com")
BUNNY_CDN_HOSTNAME = os.getenv("BUNNY_CDN_HOSTNAME", "")  # e.g., "yourzone.b-cdn.net"

# Upload settings
MAX_CONCURRENT_UPLOADS = int(os.getenv("MAX_CONCURRENT_UPLOADS", "20"))
UPLOAD_TIMEOUT = int(os.getenv("UPLOAD_TIMEOUT", "60"))
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "3"))
RETRY_BACKOFF = float(os.getenv("RETRY_BACKOFF", "2.0"))

# Database batch settings
DB_BATCH_SIZE = int(os.getenv("DB_BATCH_SIZE", "1000"))


def validate_bunny_config():
    """Validate BunnyCDN configuration"""
    missing = []
    if not BUNNY_STORAGE_ZONE:
        missing.append("BUNNY_STORAGE_ZONE")
    if not BUNNY_API_KEY:
        missing.append("BUNNY_API_KEY")
    if not BUNNY_CDN_HOSTNAME:
        missing.append("BUNNY_CDN_HOSTNAME")

    if missing:
        return False, missing
    return True, []


def get_cdn_url(path: str) -> str:
    """Generate CDN URL for a file path"""
    return f"https://{BUNNY_CDN_HOSTNAME}/{path}"
