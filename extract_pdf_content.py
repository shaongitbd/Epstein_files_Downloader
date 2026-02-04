"""
PDF Content Extractor
Extracts images and text from PDF files.
- Creates a folder for each PDF with extracted images
- Extracts EXIF/metadata from images
- Saves text content to JSON
"""

import fitz  # PyMuPDF
import os
import json
import io
from pathlib import Path
from tqdm import tqdm
import logging
from concurrent.futures import ProcessPoolExecutor, as_completed
import multiprocessing
from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
import exifread

# Configuration
DOWNLOADS_DIR = Path("downloads")
IMAGES_OUTPUT_DIR = Path("extracted_images")
TEXT_OUTPUT_DIR = Path("extracted_text")
MAX_WORKERS = multiprocessing.cpu_count()  # Parallel processing

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("extraction.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def extract_exif_pillow(image_bytes: bytes) -> dict:
    """Extract EXIF data using Pillow"""
    exif_data = {}
    try:
        img = Image.open(io.BytesIO(image_bytes))
        exif_raw = img._getexif()
        if exif_raw:
            for tag_id, value in exif_raw.items():
                tag_name = TAGS.get(tag_id, tag_id)
                # Convert bytes to string if needed
                if isinstance(value, bytes):
                    try:
                        value = value.decode('utf-8', errors='ignore')
                    except:
                        value = str(value)
                # Handle GPS data specially
                if tag_name == "GPSInfo":
                    gps_data = {}
                    for gps_tag_id, gps_value in value.items():
                        gps_tag_name = GPSTAGS.get(gps_tag_id, gps_tag_id)
                        gps_data[gps_tag_name] = str(gps_value)
                    exif_data["GPSInfo"] = gps_data
                else:
                    # Convert non-serializable types to string
                    try:
                        json.dumps(value)
                        exif_data[tag_name] = value
                    except (TypeError, ValueError):
                        exif_data[tag_name] = str(value)
    except Exception as e:
        pass
    return exif_data


def extract_exif_exifread(image_bytes: bytes) -> dict:
    """Extract EXIF data using exifread (more comprehensive)"""
    exif_data = {}
    try:
        tags = exifread.process_file(io.BytesIO(image_bytes), details=True)
        for tag, value in tags.items():
            if tag not in ('JPEGThumbnail', 'TIFFThumbnail', 'Filename', 'EXIF MakerNote'):
                # Convert to string for JSON serialization
                exif_data[tag] = str(value)
    except Exception as e:
        pass
    return exif_data


def extract_image_metadata(image_bytes: bytes, image_ext: str) -> dict:
    """Extract all available metadata from an image"""
    metadata = {
        "exif_pillow": {},
        "exif_exifread": {},
        "image_info": {}
    }

    # Get basic image info
    try:
        img = Image.open(io.BytesIO(image_bytes))
        metadata["image_info"] = {
            "format": img.format,
            "mode": img.mode,
            "width": img.width,
            "height": img.height,
        }
        # Get additional info if available
        if hasattr(img, 'info') and img.info:
            for key, value in img.info.items():
                if key not in ('exif', 'icc_profile'):  # Skip binary data
                    try:
                        json.dumps(value)
                        metadata["image_info"][key] = value
                    except:
                        metadata["image_info"][key] = str(value)
    except:
        pass

    # Extract EXIF using both methods for completeness
    metadata["exif_pillow"] = extract_exif_pillow(image_bytes)
    metadata["exif_exifread"] = extract_exif_exifread(image_bytes)

    # Combine and deduplicate (prefer exifread as it's more detailed)
    combined_exif = {**metadata["exif_pillow"]}
    for key, value in metadata["exif_exifread"].items():
        # Normalize key names
        clean_key = key.replace("EXIF ", "").replace("Image ", "")
        if clean_key not in combined_exif:
            combined_exif[clean_key] = value

    metadata["combined_exif"] = combined_exif

    return metadata


def extract_images_from_pdf(pdf_path: Path, output_dir: Path) -> dict:
    """Extract all images from a PDF file"""
    images_info = []

    try:
        doc = fitz.open(pdf_path)
        pdf_name = pdf_path.stem
        pdf_output_dir = output_dir / pdf_name

        image_count = 0

        for page_num in range(len(doc)):
            page = doc[page_num]
            image_list = page.get_images(full=True)

            for img_index, img_info in enumerate(image_list):
                xref = img_info[0]

                try:
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]

                    # Only create folder if we have images
                    if image_count == 0:
                        pdf_output_dir.mkdir(parents=True, exist_ok=True)

                    image_filename = f"page{page_num + 1}_img{img_index + 1}.{image_ext}"
                    image_path = pdf_output_dir / image_filename

                    with open(image_path, "wb") as img_file:
                        img_file.write(image_bytes)

                    # Extract EXIF/metadata
                    metadata = extract_image_metadata(image_bytes, image_ext)

                    images_info.append({
                        "page": page_num + 1,
                        "filename": image_filename,
                        "width": base_image.get("width", 0),
                        "height": base_image.get("height", 0),
                        "size_bytes": len(image_bytes),
                        "metadata": metadata
                    })

                    image_count += 1

                except Exception as e:
                    logger.debug(f"Could not extract image {xref} from {pdf_name}: {e}")

        doc.close()

        # Save metadata JSON if we have images
        if image_count > 0 and images_info:
            metadata_path = pdf_output_dir / "metadata.json"
            with open(metadata_path, "w", encoding="utf-8") as f:
                json.dump({
                    "source_pdf": pdf_path.name,
                    "image_count": image_count,
                    "images": images_info
                }, f, indent=2, ensure_ascii=False)

        return {
            "status": "success",
            "image_count": image_count,
            "images": images_info
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "image_count": 0,
            "images": []
        }


def extract_text_from_pdf(pdf_path: Path) -> dict:
    """Extract all text from a PDF file"""
    try:
        doc = fitz.open(pdf_path)

        pages_text = []
        full_text = ""

        for page_num in range(len(doc)):
            page = doc[page_num]
            text = page.get_text("text")
            pages_text.append({
                "page": page_num + 1,
                "text": text
            })
            full_text += text + "\n"

        doc.close()

        return {
            "status": "success",
            "page_count": len(pages_text),
            "pages": pages_text,
            "full_text": full_text.strip(),
            "char_count": len(full_text.strip())
        }

    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "page_count": 0,
            "pages": [],
            "full_text": "",
            "char_count": 0
        }


def process_single_pdf(pdf_path: Path, images_dir: Path, text_dir: Path) -> dict:
    """Process a single PDF - extract images and text"""
    pdf_name = pdf_path.stem

    result = {
        "filename": pdf_path.name,
        "path": str(pdf_path)
    }

    # Extract images
    images_result = extract_images_from_pdf(pdf_path, images_dir)
    result["images"] = images_result

    # Extract text
    text_result = extract_text_from_pdf(pdf_path)
    result["text"] = {
        "status": text_result["status"],
        "page_count": text_result["page_count"],
        "char_count": text_result["char_count"]
    }

    # Save text to JSON file
    if text_result["status"] == "success":
        text_output_path = text_dir / f"{pdf_name}.json"
        text_dir.mkdir(parents=True, exist_ok=True)

        text_data = {
            "filename": pdf_path.name,
            "page_count": text_result["page_count"],
            "pages": text_result["pages"],
            "full_text": text_result["full_text"]
        }

        with open(text_output_path, "w", encoding="utf-8") as f:
            json.dump(text_data, f, indent=2, ensure_ascii=False)

    return result


def process_pdf_wrapper(args):
    """Wrapper for multiprocessing"""
    pdf_path, images_dir, text_dir = args
    return process_single_pdf(Path(pdf_path), Path(images_dir), Path(text_dir))


def main():
    # Create output directories
    IMAGES_OUTPUT_DIR.mkdir(exist_ok=True)
    TEXT_OUTPUT_DIR.mkdir(exist_ok=True)

    # Get list of PDFs
    pdf_files = list(DOWNLOADS_DIR.glob("*.pdf"))

    if not pdf_files:
        logger.info("No PDF files found in downloads folder")
        return

    logger.info(f"Found {len(pdf_files):,} PDF files to process")
    logger.info(f"Using {MAX_WORKERS} workers")
    logger.info(f"Images output: {IMAGES_OUTPUT_DIR.absolute()}")
    logger.info(f"Text output: {TEXT_OUTPUT_DIR.absolute()}")

    # Track statistics
    total_images = 0
    total_text_chars = 0
    successful = 0
    failed = 0

    # Process PDFs with progress bar
    # Using ProcessPoolExecutor for CPU-bound PDF processing
    args_list = [(str(pdf), str(IMAGES_OUTPUT_DIR), str(TEXT_OUTPUT_DIR)) for pdf in pdf_files]

    with ProcessPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_pdf_wrapper, args): args[0] for args in args_list}

        with tqdm(total=len(pdf_files), desc="Extracting", unit="pdf") as pbar:
            for future in as_completed(futures):
                pdf_path = futures[future]
                try:
                    result = future.result()

                    if result["images"]["status"] == "success":
                        total_images += result["images"]["image_count"]

                    if result["text"]["status"] == "success":
                        total_text_chars += result["text"]["char_count"]
                        successful += 1
                    else:
                        failed += 1
                        logger.warning(f"Failed to process {pdf_path}")

                except Exception as e:
                    failed += 1
                    logger.error(f"Error processing {pdf_path}: {e}")

                pbar.update(1)

    # Summary
    logger.info(f"\n{'=' * 60}")
    logger.info("EXTRACTION COMPLETE")
    logger.info(f"{'=' * 60}")
    logger.info(f"PDFs processed: {successful:,}")
    logger.info(f"Failed: {failed:,}")
    logger.info(f"Total images extracted: {total_images:,}")
    logger.info(f"Total text characters: {total_text_chars:,}")


if __name__ == "__main__":
    main()
