"""
DOJ Epstein Files Downloader - Robust Version
Downloads EFTA00000001.pdf through EFTA02731783.pdf
Features:
- Async parallel downloads
- Automatic retries with exponential backoff
- Rate limiting to avoid blocks
- Resume capability with checkpointing
- Handles 429/503 errors gracefully
"""

import asyncio
import aiohttp
import aiofiles
import os
import json
import argparse
from pathlib import Path
from tqdm import tqdm
import time
import logging
from datetime import datetime
import random
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configuration
BASE_URL = "https://www.justice.gov/epstein/"
DEFAULT_DATASET = "files/DataSet%201/"
DEFAULT_START = 1
DEFAULT_END = 2731783
OUTPUT_DIR = Path("downloads")
MAX_CONCURRENT = 20  # Conservative to avoid rate limits
CHUNK_SIZE = 8192
LOG_FILE = "download_progress.log"
FAILED_FILE = "failed_downloads.txt"
CHECKPOINT_FILE = "checkpoint.json"
CHECKPOINT_INTERVAL = 1000  # Save progress every N files

# Retry configuration
MAX_RETRIES = 5
INITIAL_BACKOFF = 1  # seconds
MAX_BACKOFF = 60  # seconds

# Rate limiting
RATE_LIMIT_PAUSE = 30  # seconds to pause on 429
REQUESTS_PER_SECOND = 20  # Target requests per second

# Load cookies from environment variables
COOKIES = {
    "ak_bmsc": os.getenv("DOJ_COOKIE_AK_BMSC", ""),
    "justiceGovAgeVerified": os.getenv("DOJ_COOKIE_AGE_VERIFIED", "true"),
    "QueueITAccepted-SDFrts345E-V3_usdojfiles": os.getenv("DOJ_COOKIE_QUEUE_IT", ""),
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class RateLimiter:
    """Token bucket rate limiter"""
    def __init__(self, rate: float):
        self.rate = rate
        self.tokens = rate
        self.last_update = time.monotonic()
        self.lock = asyncio.Lock()

    async def acquire(self):
        async with self.lock:
            now = time.monotonic()
            elapsed = now - self.last_update
            self.tokens = min(self.rate, self.tokens + elapsed * self.rate)
            self.last_update = now

            if self.tokens < 1:
                wait_time = (1 - self.tokens) / self.rate
                await asyncio.sleep(wait_time)
                self.tokens = 0
            else:
                self.tokens -= 1


class DownloadStats:
    """Track download statistics"""
    def __init__(self):
        self.success = 0
        self.failed = 0
        self.skipped_404 = 0
        self.retries = 0
        self.bytes_downloaded = 0
        self.start_time = time.time()
        self.lock = asyncio.Lock()

    async def record_success(self, size: int = 0):
        async with self.lock:
            self.success += 1
            self.bytes_downloaded += size

    async def record_failure(self):
        async with self.lock:
            self.failed += 1

    async def record_404(self):
        async with self.lock:
            self.skipped_404 += 1

    async def record_retry(self):
        async with self.lock:
            self.retries += 1

    def get_speed(self) -> float:
        elapsed = time.time() - self.start_time
        if elapsed > 0:
            return self.success / elapsed
        return 0


def get_filename(num: int) -> str:
    """Generate filename like EFTA00000001.pdf"""
    return f"EFTA{num:08d}.pdf"


def get_url(num: int, dataset: str) -> str:
    """Generate URL for a given file number"""
    return f"{BASE_URL}{dataset}{get_filename(num)}"


def load_checkpoint() -> dict:
    """Load checkpoint from file"""
    if Path(CHECKPOINT_FILE).exists():
        try:
            with open(CHECKPOINT_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {"completed": [], "failed": [], "not_found": []}


def save_checkpoint(completed: set, failed: list, not_found: list):
    """Save checkpoint to file"""
    data = {
        "completed": list(completed),
        "failed": failed,
        "not_found": not_found,
        "timestamp": datetime.now().isoformat()
    }
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(data, f)


def get_downloaded_files() -> set:
    """Get set of already downloaded file numbers"""
    downloaded = set()
    if OUTPUT_DIR.exists():
        for f in OUTPUT_DIR.glob("EFTA*.pdf"):
            try:
                num = int(f.stem[4:])
                if f.stat().st_size > 0:
                    downloaded.add(num)
            except (ValueError, OSError):
                pass
    return downloaded


async def download_file_with_retry(
    session: aiohttp.ClientSession,
    num: int,
    semaphore: asyncio.Semaphore,
    rate_limiter: RateLimiter,
    stats: DownloadStats,
    pbar: tqdm,
    dataset: str
) -> tuple[int, str, str]:
    """Download a single file with retries and exponential backoff"""

    async with semaphore:
        await rate_limiter.acquire()

        url = get_url(num, dataset)
        filepath = OUTPUT_DIR / get_filename(num)
        backoff = INITIAL_BACKOFF

        for attempt in range(MAX_RETRIES):
            try:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=60)) as response:
                    if response.status == 200:
                        content = await response.read()
                        async with aiofiles.open(filepath, 'wb') as f:
                            await f.write(content)
                        await stats.record_success(len(content))
                        pbar.update(1)
                        return (num, "success", f"{len(content)} bytes")

                    elif response.status == 404:
                        await stats.record_404()
                        pbar.update(1)
                        return (num, "not_found", "404")

                    elif response.status == 429:
                        # Rate limited - pause and retry
                        logger.warning(f"Rate limited (429) on {num}, pausing {RATE_LIMIT_PAUSE}s...")
                        await stats.record_retry()
                        await asyncio.sleep(RATE_LIMIT_PAUSE + random.uniform(0, 5))
                        continue

                    elif response.status == 503:
                        # Server overloaded
                        logger.warning(f"Server busy (503) on {num}, backing off {backoff}s...")
                        await stats.record_retry()
                        await asyncio.sleep(backoff + random.uniform(0, 2))
                        backoff = min(backoff * 2, MAX_BACKOFF)
                        continue

                    elif response.status == 302:
                        # Redirect - likely cookie expired
                        logger.error(f"Got 302 redirect on {num} - cookies may have expired!")
                        return (num, "failed", "Cookie expired - 302 redirect")

                    else:
                        logger.warning(f"HTTP {response.status} for {num}")
                        await stats.record_retry()
                        await asyncio.sleep(backoff)
                        backoff = min(backoff * 2, MAX_BACKOFF)

            except asyncio.TimeoutError:
                await stats.record_retry()
                logger.debug(f"Timeout on {num}, attempt {attempt + 1}")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, MAX_BACKOFF)

            except aiohttp.ClientError as e:
                await stats.record_retry()
                logger.debug(f"Connection error on {num}: {e}")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, MAX_BACKOFF)

            except Exception as e:
                await stats.record_retry()
                logger.error(f"Unexpected error on {num}: {e}")
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2, MAX_BACKOFF)

        # All retries exhausted
        await stats.record_failure()
        pbar.update(1)
        return (num, "failed", f"Max retries ({MAX_RETRIES}) exhausted")


async def download_batch(
    nums: list[int],
    stats: DownloadStats,
    pbar: tqdm,
    dataset: str
) -> list[tuple[int, str, str]]:
    """Download a batch of files"""
    semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    rate_limiter = RateLimiter(REQUESTS_PER_SECOND)

    connector = aiohttp.TCPConnector(
        limit=MAX_CONCURRENT,
        limit_per_host=MAX_CONCURRENT,
        ttl_dns_cache=300,
        enable_cleanup_closed=True
    )

    async with aiohttp.ClientSession(connector=connector, cookies=COOKIES) as session:
        tasks = [
            download_file_with_retry(session, num, semaphore, rate_limiter, stats, pbar, dataset)
            for num in nums
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    processed = []
    for i, result in enumerate(results):
        if isinstance(result, Exception):
            processed.append((nums[i], "failed", str(result)))
        else:
            processed.append(result)

    return processed


def validate_cookies():
    """Validate that required cookies are loaded from .env"""
    missing = []
    if not COOKIES.get("ak_bmsc"):
        missing.append("DOJ_COOKIE_AK_BMSC")
    if not COOKIES.get("QueueITAccepted-SDFrts345E-V3_usdojfiles"):
        missing.append("DOJ_COOKIE_QUEUE_IT")

    if missing:
        logger.error("Missing required cookies in .env file:")
        for cookie in missing:
            logger.error(f"  - {cookie}")
        logger.error("Please add these to your .env file and try again.")
        return False
    return True


async def main(start_num: int, end_num: int, dataset: str):
    # Validate cookies before starting
    if not validate_cookies():
        return

    # Create output directory
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Load checkpoint
    checkpoint = load_checkpoint()
    already_done = set(checkpoint.get("completed", []))

    # Get already downloaded files from disk
    logger.info("Scanning for already downloaded files...")
    downloaded = get_downloaded_files()
    already_done.update(downloaded)
    logger.info(f"Found {len(already_done):,} already completed files")

    # Generate list of files to download within the specified range
    to_download = [n for n in range(start_num, end_num + 1) if n not in already_done]
    total = len(to_download)

    if total == 0:
        logger.info("All files already downloaded!")
        return

    logger.info(f"=" * 60)
    logger.info(f"DOJ Epstein Files Downloader")
    logger.info(f"=" * 60)
    logger.info(f"Dataset: {dataset}")
    logger.info(f"Range: EFTA{start_num:08d} to EFTA{end_num:08d}")
    logger.info(f"Files to download: {total:,}")
    logger.info(f"Concurrent connections: {MAX_CONCURRENT}")
    logger.info(f"Rate limit: {REQUESTS_PER_SECOND} req/sec")
    logger.info(f"Output directory: {OUTPUT_DIR.absolute()}")
    logger.info(f"=" * 60)

    stats = DownloadStats()
    completed = already_done.copy()
    failed = []
    not_found = []

    batch_size = 5000  # Smaller batches for better checkpointing

    with tqdm(total=total, desc="Downloading", unit="file", dynamic_ncols=True) as pbar:
        for i in range(0, total, batch_size):
            batch = to_download[i:i + batch_size]
            results = await download_batch(batch, stats, pbar, dataset)

            # Process results
            for num, status, msg in results:
                if status == "success":
                    completed.add(num)
                elif status == "not_found":
                    not_found.append(num)
                    completed.add(num)  # Don't retry 404s
                else:
                    failed.append(num)
                    logger.warning(f"Failed {get_filename(num)}: {msg}")

            # Checkpoint
            save_checkpoint(completed, failed, not_found)

            # Log progress
            speed = stats.get_speed()
            remaining = total - (stats.success + stats.failed + stats.skipped_404)
            if speed > 0:
                eta_hours = remaining / speed / 3600
                logger.info(f"Progress: {stats.success:,} OK, {stats.skipped_404:,} 404s, {stats.failed:,} failed | {speed:.1f} files/sec | ETA: {eta_hours:.1f}h")

    # Final summary
    elapsed = time.time() - stats.start_time
    logger.info(f"\n{'=' * 60}")
    logger.info(f"DOWNLOAD COMPLETE")
    logger.info(f"{'=' * 60}")
    logger.info(f"Total time: {elapsed/3600:.2f} hours")
    logger.info(f"Successful: {stats.success:,}")
    logger.info(f"Not found (404): {stats.skipped_404:,}")
    logger.info(f"Failed: {stats.failed:,}")
    logger.info(f"Total retries: {stats.retries:,}")
    logger.info(f"Data downloaded: {stats.bytes_downloaded / 1024 / 1024 / 1024:.2f} GB")
    logger.info(f"Average speed: {stats.get_speed():.2f} files/sec")

    # Save final failed list
    if failed:
        with open(FAILED_FILE, 'w') as f:
            for num in sorted(failed):
                f.write(f"{num}\n")
        logger.info(f"Failed downloads saved to {FAILED_FILE}")
        logger.info("Run the script again to retry failed downloads")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Download Epstein files from DOJ",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python download_epstein_files.py                     # Download all from DataSet 1
  python download_epstein_files.py -s 3159 -e 4000    # Download range 3159-4000
  python download_epstein_files.py -d "files/DataSet%202/"  # Use different dataset
  python download_epstein_files.py -d "files/DataSet%202/" -s 1 -e 1000  # Dataset 2, range 1-1000
        """
    )
    parser.add_argument("-s", "--start", type=int, default=DEFAULT_START,
                        help=f"Start file number (default: {DEFAULT_START})")
    parser.add_argument("-e", "--end", type=int, default=DEFAULT_END,
                        help=f"End file number (default: {DEFAULT_END})")
    parser.add_argument("-d", "--dataset", type=str, default=DEFAULT_DATASET,
                        help="Dataset path (default: files/DataSet%%201/)")

    args = parser.parse_args()

    print(f"Dataset: {args.dataset}")
    print(f"Download range: EFTA{args.start:08d} to EFTA{args.end:08d}")

    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    try:
        asyncio.run(main(args.start, args.end, args.dataset))
    except KeyboardInterrupt:
        logger.info("\nDownload interrupted by user. Progress saved to checkpoint.")
        logger.info("Run the script again to resume.")
