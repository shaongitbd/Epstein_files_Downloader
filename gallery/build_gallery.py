"""
Gallery Builder for Epstein Files Archive
Builds a static site with search index from extracted data
"""

import json
import os
import shutil
from pathlib import Path
from datetime import datetime
import re

# Configuration
PROJECT_ROOT = Path(__file__).parent.parent
EXTRACTED_IMAGES = PROJECT_ROOT / "extracted_images"
EXTRACTED_TEXT = PROJECT_ROOT / "extracted_text"
GALLERY_DIR = Path(__file__).parent
OUTPUT_DIR = GALLERY_DIR / "dist"
IMAGES_OUTPUT = OUTPUT_DIR / "images"

def sanitize_text(text: str) -> str:
    """Sanitize text for JSON embedding"""
    if not text:
        return ""
    # Remove null bytes and control characters
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    return text

def build_gallery():
    """Build the gallery data and copy images"""

    print("Building Epstein Files Gallery...")

    # Create output directories
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    IMAGES_OUTPUT.mkdir(parents=True, exist_ok=True)

    # Collect all data
    documents = []
    images = []

    # Get all PDF folders in extracted_images
    if not EXTRACTED_IMAGES.exists():
        print(f"No extracted images found at {EXTRACTED_IMAGES}")
        return

    pdf_folders = sorted([f for f in EXTRACTED_IMAGES.iterdir() if f.is_dir()])
    print(f"Found {len(pdf_folders)} document folders")

    for pdf_folder in pdf_folders:
        pdf_name = pdf_folder.name
        metadata_file = pdf_folder / "metadata.json"
        text_file = EXTRACTED_TEXT / f"{pdf_name}.json"

        # Load text data
        text_data = {"pages": [], "full_text": ""}
        if text_file.exists():
            try:
                with open(text_file, 'r', encoding='utf-8') as f:
                    text_data = json.load(f)
            except:
                pass

        # Load image metadata
        if not metadata_file.exists():
            continue

        try:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                img_metadata = json.load(f)
        except:
            continue

        # Process each image
        for img_info in img_metadata.get("images", []):
            img_filename = img_info.get("filename", "")
            img_path = pdf_folder / img_filename

            if not img_path.exists():
                continue

            # Copy image to output
            dest_folder = IMAGES_OUTPUT / pdf_name
            dest_folder.mkdir(parents=True, exist_ok=True)
            dest_path = dest_folder / img_filename

            if not dest_path.exists():
                shutil.copy2(img_path, dest_path)

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
            image_info = metadata.get("image_info", {})

            # Build image record
            image_record = {
                "id": f"{pdf_name}_{img_filename}",
                "pdf": pdf_name,
                "filename": img_filename,
                "path": f"images/{pdf_name}/{img_filename}",
                "page": page_num,
                "width": img_info.get("width", 0),
                "height": img_info.get("height", 0),
                "size": img_info.get("size_bytes", 0),
                "format": image_info.get("format", ""),
                "text": page_text,
                "full_text": sanitize_text(text_data.get("full_text", "")),
                "exif": combined_exif,
                "has_gps": "GPSInfo" in combined_exif or any("GPS" in k for k in combined_exif.keys()),
                "date": combined_exif.get("DateTimeOriginal", combined_exif.get("DateTime", "")),
                "camera": f"{combined_exif.get('Make', '')} {combined_exif.get('Model', '')}".strip(),
            }

            images.append(image_record)

        # Build document record
        doc_record = {
            "id": pdf_name,
            "filename": f"{pdf_name}.pdf",
            "page_count": text_data.get("page_count", 0),
            "full_text": sanitize_text(text_data.get("full_text", "")),
            "image_count": len(img_metadata.get("images", [])),
        }
        documents.append(doc_record)

    print(f"Processed {len(documents)} documents with {len(images)} images")

    # Write data files
    with open(OUTPUT_DIR / "data.json", 'w', encoding='utf-8') as f:
        json.dump({
            "documents": documents,
            "images": images,
            "generated": datetime.now().isoformat(),
            "stats": {
                "total_documents": len(documents),
                "total_images": len(images),
                "images_with_gps": sum(1 for img in images if img["has_gps"]),
                "images_with_date": sum(1 for img in images if img["date"]),
            }
        }, f, indent=2)

    # Build search index data (lighter version for search)
    search_data = []
    for img in images:
        search_data.append({
            "id": img["id"],
            "pdf": img["pdf"],
            "text": img["text"][:5000] if img["text"] else "",  # Limit text size
            "page": img["page"],
        })

    with open(OUTPUT_DIR / "search_index.json", 'w', encoding='utf-8') as f:
        json.dump(search_data, f)

    print(f"Gallery built successfully!")
    print(f"Output: {OUTPUT_DIR}")
    print(f"To view: open {OUTPUT_DIR / 'index.html'} in a browser")
    print(f"Or run: python -m http.server 8000 --directory {OUTPUT_DIR}")

if __name__ == "__main__":
    build_gallery()
