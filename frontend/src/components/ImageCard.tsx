'use client';

import Link from 'next/link';
import { Image } from '@/lib/api';
import { formatFileSize } from '@/lib/api';
import { MapPin, Calendar, FileText, Eye } from 'lucide-react';

interface ImageCardProps {
  image: Image;
  onClick?: () => void;
  index?: number;
}

export function ImageCard({ image, onClick, index = 0 }: ImageCardProps) {
  const delay = Math.min(index * 50, 500);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  // Truncate document_id for compact display
  const shortDocId = image.document_id.length > 12
    ? image.document_id.substring(0, 10) + '...'
    : image.document_id;

  return (
    <Link
      href={`/image/${image.id}`}
      onClick={handleClick}
      style={{ animationDelay: `${delay}ms` }}
      className="group relative bg-zinc-900/50 border border-zinc-800/50 overflow-hidden cursor-pointer animate-fade-in-up card-hover edge-highlight block"
    >
      {/* Evidence ID badges — top left */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-0">
        <span className="font-mono text-[10px] font-semibold tracking-wider px-2 py-1 bg-black/80 border border-amber-500/40 text-amber-500 backdrop-blur-sm border-r-0" title={image.document_id}>
          {shortDocId}
        </span>
        <span className="font-display text-[10px] font-bold px-1.5 py-1 bg-amber-500/15 border border-amber-500/40 text-amber-400 backdrop-blur-sm">
          P{image.page}
        </span>
      </div>

      {/* GPS/Date badges — top right as small icon squares */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
        {image.has_gps && (
          <span className="w-7 h-7 flex items-center justify-center bg-black/70 border border-emerald-500/40 backdrop-blur-sm animate-radar-ping" title="GPS Data">
            <MapPin size={12} className="text-emerald-400" />
          </span>
        )}
        {image.date_taken && (
          <span className="w-7 h-7 flex items-center justify-center bg-black/70 border border-blue-500/30 backdrop-blur-sm" title={image.date_taken}>
            <Calendar size={12} className="text-blue-400" />
          </span>
        )}
      </div>

      {/* Image container */}
      <div className="aspect-[4/3] overflow-hidden bg-zinc-950 relative">
        <img
          src={image.cdn_url || '/placeholder.png'}
          alt={image.document_id}
          loading="lazy"
          className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-105 image-vintage"
        />

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

        {/* Text preview slides up on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
          <div className="relative">
            <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-black to-transparent" />
            <p className="font-mono text-[11px] leading-relaxed text-zinc-400 line-clamp-3">
              {image.page_text?.substring(0, 180) || 'No text content extracted from this document page.'}
            </p>
          </div>
        </div>

        {/* Eye icon overlay on hover */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-500/50 flex items-center justify-center">
            <Eye className="w-5 h-5 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Bottom info section — single row metadata */}
      <div className="relative px-4 py-3 bg-gradient-to-b from-zinc-900/80 to-zinc-900">
        <div className="relative flex items-center justify-between">
          {/* Metadata row with dividers */}
          <div className="flex items-center gap-2.5 font-mono text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="w-1 h-1 bg-zinc-600 rounded-full" />
              {image.width}&times;{image.height}
            </span>
            <span className="w-px h-3 bg-zinc-800" />
            <span>{formatFileSize(image.size_bytes)}</span>
            {image.format && (
              <>
                <span className="w-px h-3 bg-zinc-800" />
                <span className="uppercase">{image.format}</span>
              </>
            )}
          </div>

          {/* OCR TEXT badge — only when significant text exists */}
          {image.page_text && image.page_text.length > 50 && (
            <span className="inline-flex items-center gap-1 font-mono text-[9px] px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/30 text-violet-400 tracking-wider">
              <FileText size={9} />
              TEXT
            </span>
          )}
        </div>
      </div>

      {/* Hover border glow effect */}
      <div className="absolute inset-0 border border-amber-500/0 group-hover:border-amber-500/40 transition-colors duration-300 pointer-events-none" />

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </Link>
  );
}
