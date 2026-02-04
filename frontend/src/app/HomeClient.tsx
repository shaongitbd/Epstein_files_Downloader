'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, Grid, List, FileText, MapPin, Calendar, Shield, Database, ChevronDown, HelpCircle } from 'lucide-react';
import { ImageCard } from '@/components/ImageCard';
import {
  Image,
  Stats,
  ImageFilters,
  getImages,
  search as apiSearch,
  formatNumber,
} from '@/lib/api';

type FilterType = 'all' | 'has_gps' | 'has_date' | 'has_text';
type ViewType = 'grid' | 'list';

interface HomeClientProps {
  initialImages: Image[];
  initialStats: Stats | null;
  initialTotal: number;
  initialCursor?: string;
  initialHasMore: boolean;
  initialSearchQuery: string;
}

export function HomeClient({
  initialImages,
  initialStats,
  initialTotal,
  initialCursor,
  initialHasMore,
  initialSearchQuery,
}: HomeClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [images, setImages] = useState<Image[]>(initialImages);
  const [stats] = useState<Stats | null>(initialStats);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [viewType, setViewType] = useState<ViewType>('grid');

  const [cursor, setCursor] = useState<string | undefined>(initialCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [total, setTotal] = useState(initialTotal);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Mount animation
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync search query from URL on mount
  useEffect(() => {
    const q = searchParams.get('q') || '';
    if (q !== searchQuery) {
      setSearchQuery(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch images
  const fetchImages = useCallback(
    async (reset = false, query?: string) => {
      try {
        if (reset) {
          setLoading(true);
          setImages([]);
          setCursor(undefined);
        } else {
          setLoadingMore(true);
        }

        const filters: ImageFilters = {};
        if (activeFilter === 'has_gps') filters.has_gps = true;
        if (activeFilter === 'has_date') filters.has_date = true;
        if (activeFilter === 'has_text') filters.has_text = true;

        const searchTerm = query !== undefined ? query : searchQuery;
        let response;
        if (searchTerm.trim()) {
          const result = await apiSearch(searchTerm, 100);
          response = {
            data: result.images,
            has_more: false,
            total: result.total,
            next_cursor: undefined,
          };
        } else {
          response = await getImages(reset ? undefined : cursor, 50, filters);
        }

        setImages((prev) => (reset ? response.data : [...prev, ...response.data]));
        setCursor(response.next_cursor);
        setHasMore(response.has_more);
        setTotal(response.total);
        setError(null);
      } catch (err) {
        setError('Failed to load images. Is the API server running?');
        console.error(err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeFilter, searchQuery, cursor]
  );

  // Filter changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    fetchImages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter]);

  // Search debounce and URL update
  useEffect(() => {
    if (isInitialMount.current) return;

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      // Update URL with search query
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set('q', searchQuery.trim());
      }
      const newUrl = searchQuery.trim() ? `/?${params.toString()}` : '/';
      router.replace(newUrl, { scroll: false });
      
      fetchImages(true, searchQuery);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !searchQuery) {
          fetchImages(false);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, searchQuery, fetchImages]);

  const filters: { id: FilterType; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'ALL FILES', shortLabel: 'ALL', icon: <Database size={14} /> },
    { id: 'has_gps', label: 'GPS DATA', shortLabel: 'GPS', icon: <MapPin size={14} /> },
    { id: 'has_date', label: 'DATED', shortLabel: 'DATE', icon: <Calendar size={14} /> },
    { id: 'has_text', label: 'WITH TEXT', shortLabel: 'TEXT', icon: <FileText size={14} /> },
  ];

  const isLoading = loading && images.length === 0;

  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100 flex flex-col">
      {/* Atmospheric overlays */}
      <div className="noise-overlay" />
      <div className="scanlines" />
      <div className="vignette" />

      {/* Header */}
      <header className="relative border-b border-zinc-800/50 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 security-stripe opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/80 via-zinc-950/90 to-zinc-950" />

        <div className="relative max-w-[1800px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <div className={`flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 lg:gap-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Title section */}
            <div>
              {/* Classification badge */}
              <div className="inline-flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4 animate-fade-in-down" style={{ animationDelay: '200ms' }}>
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500/10 border-2 border-red-500/30">
                  <Shield size={12} className="text-red-500 sm:w-3.5 sm:h-3.5" />
                  <span className="font-mono text-[9px] sm:text-[10px] font-bold tracking-[0.2em] sm:tracking-[0.25em] text-red-500">
                    DECLASSIFIED
                  </span>
                </div>
                <div className="h-3 sm:h-4 w-px bg-zinc-700" />
                <span className="font-mono text-[9px] sm:text-[10px] text-zinc-600 tracking-wider">
                  PUBLIC ARCHIVE
                </span>
              </div>

              {/* Main title */}
              <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl font-semibold tracking-wide text-shadow-glow animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                <span className="text-gradient">EPSTEIN FILES</span>
              </h1>

              {/* Subtitle */}
              <p className="font-mono text-[10px] sm:text-xs text-zinc-500 tracking-[0.2em] sm:tracking-[0.3em] mt-2 sm:mt-3 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                DOCUMENT & IMAGE ARCHIVE
              </p>

              {/* Decorative line */}
              <div className="flex items-center gap-3 mt-3 sm:mt-4 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
                <div className="w-12 sm:w-16 h-px bg-gradient-to-r from-amber-500 to-transparent" />
              </div>

              {/* Info link */}
              <Link
                href="/who-is-jeffrey-epstein"
                className="inline-flex items-center gap-2 mt-4 text-zinc-400 hover:text-amber-500 transition-colors group animate-fade-in-up"
                style={{ animationDelay: '550ms' }}
              >
                <HelpCircle size={14} className="group-hover:scale-110 transition-transform" />
                <span className="font-mono text-[10px] sm:text-xs tracking-wider underline underline-offset-2 decoration-zinc-700 group-hover:decoration-amber-500">
                  WHO WAS JEFFREY EPSTEIN?
                </span>
              </Link>
            </div>

            {/* Stats section - horizontal scroll on mobile */}
            {stats && (
              <div className="flex gap-4 sm:gap-6 md:gap-10 animate-fade-in overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible" style={{ animationDelay: '600ms' }}>
                <StatBlock
                  value={formatNumber(stats.total_documents)}
                  label="DOCS"
                  fullLabel="DOCUMENTS"
                  icon={<FileText size={14} />}
                />
                <div className="w-px h-12 sm:h-16 bg-gradient-to-b from-transparent via-zinc-700 to-transparent flex-shrink-0" />
                <StatBlock
                  value={formatNumber(stats.total_images)}
                  label="IMGS"
                  fullLabel="IMAGES"
                  icon={<Database size={14} />}
                />
                <div className="w-px h-12 sm:h-16 bg-gradient-to-b from-transparent via-zinc-700 to-transparent flex-shrink-0" />
                <StatBlock
                  value={formatNumber(stats.images_with_gps)}
                  label="GPS"
                  fullLabel="GPS TAGGED"
                  icon={<MapPin size={14} />}
                  highlight
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom accent */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      </header>

      {/* Controls */}
      <div className="sticky top-0 z-40 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/50">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-3 sm:py-5">
          {/* Search */}
          <div className="max-w-2xl mx-auto mb-3 sm:mb-5">
            <div className="relative group">
              <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-zinc-600 transition-colors group-focus-within:text-amber-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className="w-full pl-10 sm:pl-12 pr-4 sm:pr-24 py-3 sm:py-4 bg-zinc-900/50 border border-zinc-800 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:bg-zinc-900 transition-all duration-300"
              />
              {/* Keyboard shortcut - hidden on mobile */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-2">
                <kbd className="font-mono text-[10px] px-2 py-1 bg-zinc-800/50 border border-zinc-700 text-zinc-500">CMD</kbd>
                <kbd className="font-mono text-[10px] px-2 py-1 bg-zinc-800/50 border border-zinc-700 text-zinc-500">K</kbd>
              </div>

              {/* Search glow effect */}
              <div className="absolute inset-0 -z-10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
                <div className="absolute inset-0 bg-amber-500/5 blur-xl" />
              </div>
            </div>
          </div>

          {/* Filters and view toggle */}
          <div className="flex items-center justify-between gap-3">
            {/* Filters - scrollable on mobile */}
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 -mx-1 px-1 flex-1 scrollbar-hide">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`group flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 font-mono text-[10px] sm:text-[11px] tracking-wider border transition-all duration-300 whitespace-nowrap flex-shrink-0 ${
                    activeFilter === filter.id
                      ? 'bg-amber-500/10 border-amber-500/50 text-amber-500'
                      : 'bg-zinc-900/30 border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300 hover:bg-zinc-900/50'
                  }`}
                >
                  <span className={`transition-colors ${activeFilter === filter.id ? 'text-amber-500' : 'text-zinc-600 group-hover:text-zinc-400'}`}>
                    {filter.icon}
                  </span>
                  <span className="hidden sm:inline">{filter.label}</span>
                  <span className="sm:hidden">{filter.shortLabel}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-5 flex-shrink-0">
              {/* Count indicator - compact on mobile */}
              <div className="hidden md:flex items-center gap-2 font-mono text-xs">
                <span className="text-zinc-600">SHOWING</span>
                <span className="text-amber-500 font-semibold">{formatNumber(images.length)}</span>
                <span className="text-zinc-600">OF</span>
                <span className="text-zinc-400">{formatNumber(total)}</span>
              </div>

              {/* Mobile count */}
              <div className="flex md:hidden font-mono text-[10px] text-zinc-500">
                <span className="text-amber-500">{formatNumber(images.length)}</span>
                <span className="mx-0.5">/</span>
                <span>{formatNumber(total)}</span>
              </div>

              {/* View toggle */}
              <div className="flex border border-zinc-800 bg-zinc-900/30">
                <button
                  onClick={() => setViewType('grid')}
                  className={`p-2 sm:p-2.5 transition-all duration-200 ${
                    viewType === 'grid'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <Grid size={14} className="sm:w-4 sm:h-4" />
                </button>
                <button
                  onClick={() => setViewType('list')}
                  className={`p-2 sm:p-2.5 transition-all duration-200 ${
                    viewType === 'list'
                      ? 'bg-amber-500/10 text-amber-500'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                  }`}
                >
                  <List size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gallery */}
      <main className="flex-1 max-w-[1800px] mx-auto px-4 sm:px-6 py-6 sm:py-10 w-full">
        {error && (
          <div className="text-center py-12 sm:py-16 animate-fade-in">
            <div className="inline-flex items-center gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-red-500/10 border border-red-500/30 mb-4">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <p className="text-red-400 font-mono text-xs sm:text-sm">{error}</p>
            </div>
            <p className="text-zinc-600 text-xs sm:text-sm font-mono">
              Ensure the Go backend is running on port 8080
            </p>
          </div>
        )}

        {isLoading && !error && (
          <div className="flex flex-col items-center justify-center py-16 sm:py-24 gap-4 sm:gap-6 animate-fade-in">
            <div className="relative">
              <div className="w-12 h-12 sm:w-16 sm:h-16 border-2 border-zinc-800 border-t-amber-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Database size={16} className="text-amber-500/50 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="text-center">
              <span className="font-mono text-xs sm:text-sm text-zinc-400 tracking-widest">
                ACCESSING ARCHIVE
              </span>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {!isLoading && !error && images.length === 0 && (
          <div className="text-center py-16 sm:py-24 animate-fade-in">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center">
              <FileText size={24} className="text-zinc-700 sm:w-8 sm:h-8" />
            </div>
            <h3 className="font-mono text-xs sm:text-sm text-zinc-400 tracking-wider mb-2">
              NO MATCHING RECORDS
            </h3>
            <p className="text-zinc-600 text-xs sm:text-sm max-w-md mx-auto px-4">
              No documents found matching your search criteria. Try adjusting your filters or search terms.
            </p>
          </div>
        )}

        {!isLoading && !error && images.length > 0 && (
          <>
            <div
              className={`grid gap-4 sm:gap-6 ${
                viewType === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-1 max-w-4xl mx-auto'
              }`}
            >
              {images.map((image, index) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  index={index}
                />
              ))}
            </div>

            {/* Load more trigger */}
            <div ref={loadMoreRef} className="h-20 sm:h-24 flex items-center justify-center">
              {loadingMore && (
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-zinc-800 border-t-amber-500 rounded-full animate-spin" />
                  <span className="font-mono text-[10px] sm:text-xs text-zinc-600">LOADING MORE...</span>
                </div>
              )}
              {hasMore && !loadingMore && !searchQuery && (
                <button
                  onClick={() => fetchImages(false)}
                  className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 font-mono text-[10px] sm:text-xs text-zinc-500 hover:text-amber-500 border border-zinc-800 hover:border-amber-500/50 transition-all duration-300"
                >
                  <ChevronDown size={14} />
                  LOAD MORE
                </button>
              )}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/50 bg-zinc-950">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Main footer content */}
          <div className="flex flex-col items-center gap-4 sm:gap-6 mb-4 sm:mb-6 text-center">
            <div>
              <h3 className="font-serif text-lg sm:text-xl font-semibold text-zinc-300">
                Epstein Photo Gallery
              </h3>
              <p className="font-mono text-[10px] sm:text-[11px] text-zinc-600 mt-1 tracking-wider">
                Declassified Document & Image Archive
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 font-mono text-[10px] sm:text-[11px] text-zinc-600">
              <span className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                DATA SOURCE: justice.gov/epstein
              </span>
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-500">
                v1.0
              </span>
            </div>
          </div>

          {/* Branding */}
          <div className="pt-4 sm:pt-6 border-t border-zinc-800/50 flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="font-mono text-[10px] sm:text-[11px] text-zinc-600">Developed by</span>
              <a
                href="https://quantumbytetech.com"
                target="_blank"
                rel="noopener noreferrer"
                className="group font-mono text-[10px] sm:text-[11px] text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1"
              >
                QuantumByte Technologies
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </a>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-700">
              <span>Built with</span>
              <span className="px-1.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-500">Go</span>
              <span>&amp;</span>
              <span className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 text-zinc-400">Next.js</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatBlock({
  value,
  label,
  fullLabel,
  icon,
  highlight = false,
}: {
  value: string;
  label: string;
  fullLabel: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="text-right flex-shrink-0">
      <div className={`font-mono text-xl sm:text-3xl font-medium tracking-tight ${highlight ? 'text-emerald-400' : 'text-amber-500'}`}>
        {value}
      </div>
      <div className="flex items-center justify-end gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
        <span className="text-zinc-600">{icon}</span>
        <span className="font-mono text-[9px] sm:text-[10px] text-zinc-500 tracking-widest">
          <span className="sm:hidden">{label}</span>
          <span className="hidden sm:inline">{fullLabel}</span>
        </span>
      </div>
    </div>
  );
}
