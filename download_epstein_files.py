"""
DOJ Epstein Files Downloader - Robust Version
Downloads EFTA00000001.pdf through EFTA02731783.pdf
Features:
- Automatic cookie harvesting via headless browser (patchright/playwright)
- Async parallel downloads
- Automatic retries with exponential backoff
- Rate limiting to avoid blocks
- Resume capability with checkpointing
- Handles 429/503 errors gracefully
- Proxy rotation from proxies.txt
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
MAX_CONCURRENT = 30  # Conservative to avoid rate limits
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

# Proxy configuration
PROXY_FILE = "proxies.txt"
PROXY_CHUNK_SIZE = 50  # Number of proxies to use per rotation

# Cookie harvesting
COOKIE_HARVEST_URL = "https://www.justice.gov/epstein/doj-disclosures"

# Cookies - browser harvest will populate these; .env values are fallback
COOKIES = {
    "justiceGovAgeVerified": "true",
    "ak_bmsc": os.getenv("DOJ_COOKIE_AK_BMSC", ""),
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


class ProxyPool:
    """Manages proxy rotation in chunks.

    Loads proxies from proxies.txt, splits them into chunks of PROXY_CHUNK_SIZE,
    and rotates through chunks. Within each chunk, proxies are assigned round-robin
    to concurrent downloads.
    """
    def __init__(self, proxy_file: str = PROXY_FILE, chunk_size: int = PROXY_CHUNK_SIZE):
        self.all_proxies: list[str] = []
        self.chunk_size = chunk_size
        self.current_chunk_index = 0
        self._counter = 0
        self._lock = asyncio.Lock()

        if Path(proxy_file).exists():
            with open(proxy_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#'):
                        self.all_proxies.append(line)

        if self.all_proxies:
            # Shuffle to avoid all workers hitting same proxy order
            random.shuffle(self.all_proxies)
            self.num_chunks = (len(self.all_proxies) + chunk_size - 1) // chunk_size
            logger.info(f"Loaded {len(self.all_proxies)} proxies in {self.num_chunks} chunks of ~{chunk_size}")
        else:
            self.num_chunks = 0
            logger.info("No proxies loaded — downloading directly without proxies")

    @property
    def has_proxies(self) -> bool:
        return len(self.all_proxies) > 0

    def _get_current_chunk(self) -> list[str]:
        """Get the current chunk of proxies."""
        start = self.current_chunk_index * self.chunk_size
        end = start + self.chunk_size
        return self.all_proxies[start:end]

    def advance_chunk(self):
        """Move to the next chunk of proxies. Wraps around."""
        if not self.has_proxies:
            return
        self.current_chunk_index = (self.current_chunk_index + 1) % self.num_chunks
        self._counter = 0
        chunk = self._get_current_chunk()
        logger.info(f"Rotated to proxy chunk {self.current_chunk_index + 1}/{self.num_chunks} ({len(chunk)} proxies)")

    async def get_proxy(self) -> str | None:
        """Get the next proxy from the current chunk (round-robin). Thread-safe."""
        if not self.has_proxies:
            return None
        async with self._lock:
            chunk = self._get_current_chunk()
            proxy = chunk[self._counter % len(chunk)]
            self._counter += 1
            return proxy


async def harvest_cookies_with_browser(headless: bool = True, dataset: str = DEFAULT_DATASET, probe_file: int = 1) -> dict[str, str]:
    """Launch a browser to obtain DOJ cookies by passing the age gate.

    Navigates to the DOJ disclosures page, clicks the age verification ("Yes"),
    then probes an actual file URL to trigger any download-specific cookies
    (Akamai, Queue-IT, etc.).

    Tries patchright first (better anti-detection), falls back to playwright.
    Returns a dict of cookie name -> value.
    """
    async_pw = None
    pw_name = None

    try:
        from patchright.async_api import async_playwright as _pw
        async_pw = _pw
        pw_name = "patchright"
    except ImportError:
        try:
            from playwright.async_api import async_playwright as _pw
            async_pw = _pw
            pw_name = "playwright"
        except ImportError:
            logger.error(
                "Neither patchright nor playwright is installed.\n"
                "Install one of:\n"
                "  pip install patchright && patchright install chromium  (recommended)\n"
                "  pip install playwright && playwright install chromium"
            )
            return {}

    logger.info(f"Harvesting cookies with {pw_name} (headless={headless})...")

    async with async_pw() as p:
        browser = await p.chromium.launch(headless=headless)
        context = await browser.new_context()
        page = await context.new_page()

        try:
            # Step 1: Navigate to disclosures page
            logger.info(f"Navigating to {COOKIE_HARVEST_URL}...")
            await page.goto(COOKIE_HARVEST_URL, wait_until="networkidle", timeout=60000)

            # Step 2: Check for Queue-IT waiting room
            if "queue-it" in page.url.lower() or "queue.it" in page.url.lower():
                logger.info("In Queue-IT waiting room, waiting to pass through (up to 5 min)...")
                await page.wait_for_url("**/justice.gov/**", timeout=300000)
                logger.info("Passed through Queue-IT")

            # Step 3: Click age verification "Yes" button
            try:
                yes_btn = page.get_by_role("button", name="Yes")
                if await yes_btn.is_visible(timeout=3000):
                    logger.info("Clicking age verification 'Yes' button...")
                    await yes_btn.click()
                    await page.wait_for_timeout(2000)
            except Exception:
                # Age gate might not be present or already passed
                logger.debug("No age verification gate found, continuing...")

            # Step 4: Probe an actual file URL to trigger download-specific cookies
            probe_url = f"{BASE_URL}{dataset}{get_filename(probe_file)}"
            logger.info(f"Probing file URL to trigger cookies: {probe_url}")
            try:
                await page.goto(probe_url, wait_until="networkidle", timeout=30000)
                await page.wait_for_timeout(3000)
            except Exception as e:
                logger.debug(f"Probe navigation ended with: {e}")

            # Step 5: Extract all cookies
            cookies = await context.cookies()
            cookie_dict = {c["name"]: c["value"] for c in cookies}

            # Log all cookies found
            if cookie_dict:
                logger.info(f"Found {len(cookie_dict)} cookies:")
                for name, value in cookie_dict.items():
                    logger.info(f"  {name} ({len(value)} chars)")
            else:
                logger.warning("No cookies found at all")

            return cookie_dict

        except Exception as e:
            logger.error(f"Cookie harvest failed: {e}")
            return {}
        finally:
            await browser.close()


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
    dataset: str,
    proxy_pool: ProxyPool
) -> tuple[int, str, str]:
    """Download a single file with retries and exponential backoff"""

    async with semaphore:
        await rate_limiter.acquire()

        url = get_url(num, dataset)
        filepath = OUTPUT_DIR / get_filename(num)
        backoff = INITIAL_BACKOFF

        for attempt in range(MAX_RETRIES):
            proxy = await proxy_pool.get_proxy()
            try:
                async with session.get(
                    url,
                    timeout=aiohttp.ClientTimeout(total=60),
                    proxy=proxy
                ) as response:
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
    dataset: str,
    proxy_pool: ProxyPool
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
            download_file_with_retry(session, num, semaphore, rate_limiter, stats, pbar, dataset, proxy_pool)
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
    """Log cookie status. Only justiceGovAgeVerified is strictly required."""
    if not COOKIES.get("justiceGovAgeVerified"):
        logger.error("Missing justiceGovAgeVerified cookie")
        return False

    # Log optional cookies (site may or may not require these)
    if COOKIES.get("ak_bmsc"):
        logger.info("  ak_bmsc cookie present")
    if any(k.startswith("QueueITAccepted") for k in COOKIES if COOKIES[k]):
        logger.info("  QueueIT cookie present")

    return True


async def main(start_num: int, end_num: int, dataset: str, proxy_chunk_size: int,
               use_browser: bool = True, headless: bool = True):
    global COOKIES

    # Try to harvest cookies with headless browser
    if use_browser:
        browser_cookies = await harvest_cookies_with_browser(
            headless=headless, dataset=dataset, probe_file=start_num
        )
        if browser_cookies:
            COOKIES.update(browser_cookies)
            logger.info("Using browser-harvested cookies")
        else:
            logger.warning("Browser cookie harvest failed, falling back to .env cookies")

    # Create output directory
    OUTPUT_DIR.mkdir(exist_ok=True)

    # Initialize proxy pool
    proxy_pool = ProxyPool(PROXY_FILE, proxy_chunk_size)

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
    logger.info(f"Proxies: {len(proxy_pool.all_proxies)} loaded, chunk size {proxy_chunk_size}")
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

            # Rotate to next proxy chunk for each batch
            if proxy_pool.has_proxies:
                proxy_pool.advance_chunk()

            results = await download_batch(batch, stats, pbar, dataset, proxy_pool)

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
  python download_epstein_files.py                     # Auto-harvest cookies + download
  python download_epstein_files.py -s 3159 -e 4000    # Download range 3159-4000
  python download_epstein_files.py --show-browser      # See browser during cookie harvest
  python download_epstein_files.py --no-browser        # Use .env cookies only (manual)
  python download_epstein_files.py -d "files/DataSet%202/"  # Use different dataset
  python download_epstein_files.py --proxy-chunk 100   # Use 100 proxies per rotation
        """
    )
    parser.add_argument("-s", "--start", type=int, default=DEFAULT_START,
                        help=f"Start file number (default: {DEFAULT_START})")
    parser.add_argument("-e", "--end", type=int, default=DEFAULT_END,
                        help=f"End file number (default: {DEFAULT_END})")
    parser.add_argument("-d", "--dataset", type=str, default=DEFAULT_DATASET,
                        help="Dataset path (default: files/DataSet%%201/)")
    parser.add_argument("--proxy-chunk", type=int, default=PROXY_CHUNK_SIZE,
                        help=f"Number of proxies per rotation chunk (default: {PROXY_CHUNK_SIZE})")
    parser.add_argument("--no-browser", action="store_true",
                        help="Skip automatic browser cookie harvest, use .env cookies only")
    parser.add_argument("--show-browser", action="store_true",
                        help="Show browser window during cookie harvest (for debugging)")

    args = parser.parse_args()

    print(f"Dataset: {args.dataset}")
    print(f"Download range: EFTA{args.start:08d} to EFTA{args.end:08d}")

    if os.name == 'nt':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

    try:
        asyncio.run(main(
            args.start, args.end, args.dataset, args.proxy_chunk,
            use_browser=not args.no_browser,
            headless=not args.show_browser
        ))
    except KeyboardInterrupt:
        logger.info("\nDownload interrupted by user. Progress saved to checkpoint.")
        logger.info("Run the script again to resume.")
