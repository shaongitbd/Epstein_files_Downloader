import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ImageDetailClient } from './ImageDetailClient';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

interface Image {
  id: number;
  document_id: string;
  page: number;
  filename: string;
  cdn_url: string;
  width: number;
  height: number;
  size_bytes: number;
  format: string;
  exif?: Record<string, unknown>;
  has_gps: boolean;
  date_taken?: string;
  page_text?: string;
  created_at: string;
}

async function getImage(id: string): Promise<Image | null> {
  try {
    const res = await fetch(`${API_BASE}/images/${id}`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// Generate metadata for SEO and social sharing
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const image = await getImage(id);

  if (!image) {
    return {
      title: 'Image Not Found | Jeffrey Epstein - Photo Gallery',
    };
  }

  const title = `Jeffrey Epstein - Photo Gallery ${image.id}`;
  const description = image.page_text
    ? image.page_text.substring(0, 160).trim() + '...'
    : `Declassified document image from ${image.document_id}, page ${image.page}. ${image.width}x${image.height} pixels.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [
        {
          url: image.cdn_url,
          width: image.width,
          height: image.height,
          alt: `Jeffrey Epstein - Photo Gallery ${image.id}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image.cdn_url],
    },
  };
}

export default async function ImagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const image = await getImage(id);

  if (!image) {
    notFound();
  }

  return <ImageDetailClient image={image} />;
}
