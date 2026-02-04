import { Metadata } from 'next';
import { Suspense } from 'react';
import { HomeClient } from './HomeClient';
import {
  Image,
  Stats,
  PaginatedResponse,
  SearchResult,
} from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api';

// Fetch functions for server-side data
async function getStats(): Promise<Stats | null> {
  try {
    const res = await fetch(`${API_BASE}/stats`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getImages(limit = 50): Promise<PaginatedResponse<Image>> {
  try {
    const res = await fetch(`${API_BASE}/images?limit=${limit}`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    });
    if (!res.ok) {
      return { data: [], has_more: false, total: 0 };
    }
    return res.json();
  } catch {
    return { data: [], has_more: false, total: 0 };
  }
}

async function searchImages(query: string, limit = 100): Promise<SearchResult> {
  try {
    const params = new URLSearchParams();
    params.set('q', query);
    params.set('limit', limit.toString());
    
    const res = await fetch(`${API_BASE}/search?${params}`, {
      next: { revalidate: 60 }, // Cache for 1 minute
    });
    if (!res.ok) {
      return { documents: [], images: [], query, total: 0 };
    }
    return res.json();
  } catch {
    return { documents: [], images: [], query, total: 0 };
  }
}

// Dynamic metadata based on search query
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  
  if (q) {
    const title = `Search: ${q} | Jeffrey Epstein - Photo Gallery`;
    const description = `Search results for "${q}" in the declassified Epstein files document and image archive.`;
    
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'website',
        locale: 'en_US',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  }

  const title = 'Jeffrey Epstein - Photo Gallery';
  const description = 'Browse the declassified Epstein files document and image archive. Search through extracted text, view EXIF metadata, and explore GPS-tagged images.';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

// Loading component for Suspense
function HomeLoading() {
  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-zinc-800 border-t-amber-500 rounded-full animate-spin" />
        </div>
        <span className="font-mono text-sm text-zinc-400 tracking-widest">
          LOADING ARCHIVE...
        </span>
      </div>
    </div>
  );
}

// Server component wrapper
async function HomeContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: searchQuery } = await searchParams;
  
  // Fetch data in parallel
  const [stats, imagesResponse] = await Promise.all([
    getStats(),
    searchQuery ? searchImages(searchQuery) : getImages(50),
  ]);

  // Handle search vs regular listing
  let images: Image[];
  let total: number;
  let hasMore: boolean;
  let nextCursor: string | undefined;

  if (searchQuery) {
    const searchResult = imagesResponse as SearchResult;
    images = searchResult.images || [];
    total = searchResult.total;
    hasMore = false;
    nextCursor = undefined;
  } else {
    const paginatedResult = imagesResponse as PaginatedResponse<Image>;
    images = paginatedResult.data || [];
    total = paginatedResult.total;
    hasMore = paginatedResult.has_more;
    nextCursor = paginatedResult.next_cursor;
  }

  return (
    <HomeClient
      initialImages={images}
      initialStats={stats}
      initialTotal={total}
      initialCursor={nextCursor}
      initialHasMore={hasMore}
      initialSearchQuery={searchQuery || ''}
    />
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent searchParams={searchParams} />
    </Suspense>
  );
}
