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
  // Stagger animation delay based on index
  const delay = Math.min(index * 50, 500);

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <Link
      href={`/image/${image.id}`}
      onClick={handleClick}
      style={{ animationDelay: `${delay}ms` }}
      className="group relative bg-zinc-900/50 border border-zinc-800/50 overflow-hidden cursor-pointer animate-fade-in-up card-hover corner-brackets block"
    >
      {/* Evidence ID marker */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
        <span className="font-mono text-[10px] font-semibold tracking-wider px-2 py-1 bg-black/80 border border-amber-500/40 text-amber-500 backdrop-blur-sm">
          {image.document_id}
        </span>
        <span className="font-mono text-[10px] px-1.5 py-1 bg-black/60 border border-zinc-700 text-zinc-400 backdrop-blur-sm">
          P.{image.page}
        </span>
      </div>

      {/* Image container */}
      <div className="aspect-[4/3] overflow-hidden bg-zinc-950 relative">
        <img
          src={image.cdn_url || '/placeholder.png'}
          alt={image.document_id}
          loading="lazy"
          className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110 image-vintage"
        />

        {/* Scan line effect on hover */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent animate-scan" style={{ animationDuration: '2s' }} />
        </div>

        {/* Corner indicator */}
        <div className="absolute top-0 right-0 w-0 h-0 border-t-[40px] border-t-amber-500/20 border-l-[40px] border-l-transparent transition-all duration-300 group-hover:border-t-amber-500/40" />

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

        {/* Text preview on hover */}
        <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out">
          <div className="relative">
            <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-black to-transparent" />
            <p className="font-mono text-[11px] leading-relaxed text-zinc-400 line-clamp-3">
              {image.page_text?.substring(0, 180) || 'No text content extracted from this document page.'}
            </p>
          </div>
        </div>

        {/* View indicator */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 scale-75 group-hover:scale-100">
          <div className="w-14 h-14 rounded-full bg-amber-500/20 backdrop-blur-sm border border-amber-500/50 flex items-center justify-center">
            <Eye className="w-6 h-6 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Info section */}
      <div className="relative p-4 space-y-3 bg-gradient-to-b from-zinc-900/80 to-zinc-900">
        {/* Security stripe decoration */}
        <div className="absolute inset-0 security-stripe opacity-30" />

        <div className="relative">
          {/* Metadata row */}
          <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
              {image.width}×{image.height}
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

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            {image.has_gps && (
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 transition-colors group-hover:bg-emerald-500/20 group-hover:border-emerald-500/50">
                <MapPin size={10} className="animate-pulse" />
                GPS DATA
              </span>
            )}
            {image.date_taken && (
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 transition-colors group-hover:bg-blue-500/20 group-hover:border-blue-500/50">
                <Calendar size={10} />
                {image.date_taken.split(' ')[0]}
              </span>
            )}
            {image.page_text && image.page_text.length > 50 && (
              <span className="inline-flex items-center gap-1.5 font-mono text-[10px] px-2 py-1 bg-violet-500/10 border border-violet-500/30 text-violet-400 transition-colors group-hover:bg-violet-500/20 group-hover:border-violet-500/50">
                <FileText size={10} />
                TEXT
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover border glow effect */}
      <div className="absolute inset-0 border border-amber-500/0 group-hover:border-amber-500/50 transition-colors duration-300 pointer-events-none" />

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
    </Link>
  );
}
