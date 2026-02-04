'use client';

import { useEffect, useState, useCallback } from 'react';
import { Image, formatFileSize } from '@/lib/api';
import { X, ChevronLeft, ChevronRight, Download, ExternalLink, MapPin, Calendar, Camera, FileText, Maximize2, Copy, Check, Loader2 } from 'lucide-react';

interface ImageModalProps {
  image: Image | null;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  currentIndex?: number;
  totalCount?: number;
}

type TabType = 'metadata' | 'text' | 'exif';

export function ImageModal({
  image,
  onClose,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  currentIndex = 0,
  totalCount = 0,
}: ImageModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('metadata');
  const [copied, setCopied] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev && onPrev) onPrev();
      if (e.key === 'ArrowRight' && hasNext && onNext) onNext();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrev, onNext, hasPrev, hasNext]);

  useEffect(() => {
    setImageLoaded(false);
  }, [image?.id]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = useCallback(async () => {
    if (!image || downloading) return;

    setDownloading(true);
    try {
      const response = await fetch(image.cdn_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = image.filename || `${image.document_id}_page${image.page}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(image.cdn_url, '_blank');
    } finally {
      setDownloading(false);
    }
  }, [image, downloading]);

  if (!image) return null;

  const tabs: { id: TabType; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'metadata', label: 'METADATA', shortLabel: 'INFO', icon: <Camera size={14} /> },
    { id: 'text', label: 'DOCUMENT', shortLabel: 'TEXT', icon: <FileText size={14} /> },
    { id: 'exif', label: 'EXIF', shortLabel: 'EXIF', icon: <Maximize2 size={14} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 modal-backdrop animate-fade-in"
        onClick={onClose}
      />

      {/* Vignette effect */}
      <div className="absolute inset-0 pointer-events-none vignette" />

      {/* Modal content - full screen on mobile */}
      <div className="relative w-full h-full sm:w-[95vw] sm:max-w-7xl sm:h-[90vh] sm:max-h-[900px] bg-zinc-950 sm:border sm:border-zinc-800 shadow-2xl flex flex-col animate-in overflow-hidden">
        {/* Top border accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

        {/* Header bar */}
        <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {/* Document badge - simplified on mobile */}
            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
              <span className="font-mono text-xs sm:text-sm font-semibold px-2 sm:px-3 py-1 sm:py-1.5 bg-amber-500/10 border border-amber-500 text-amber-500 truncate max-w-[120px] sm:max-w-none">
                {image.document_id}
              </span>
              <span className="font-mono text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400 hidden xs:block">
                P.{image.page}
              </span>
            </div>

            {/* Declassified stamp - hidden on mobile */}
            <div className="hidden lg:flex items-center px-3 py-1 border-2 border-red-500/30 rotate-[-2deg]">
              <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-red-500/50">
                DECLASSIFIED
              </span>
            </div>
          </div>

          {/* Counter and close */}
          <div className="flex items-center gap-2 sm:gap-4">
            <span className="font-mono text-xs sm:text-sm text-zinc-500">
              <span className="text-amber-500">{currentIndex + 1}</span>
              <span className="mx-0.5 sm:mx-1">/</span>
              <span>{totalCount}</span>
            </span>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600 hover:bg-zinc-800 transition-all duration-200"
            >
              <X size={18} className="sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* Main layout - stacked on mobile, side-by-side on desktop */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[1fr_420px] overflow-hidden">
          {/* Image section */}
          <div className={`flex flex-col bg-black relative ${showInfo ? 'hidden lg:flex' : 'flex'}`}>
            {/* Image container */}
            <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-hidden relative min-h-[200px]">
              {/* Loading skeleton */}
              {!imageLoaded && (
                <div className="absolute inset-4 sm:inset-6 skeleton flex items-center justify-center">
                  <div className="font-mono text-[10px] sm:text-xs text-zinc-600 tracking-widest">
                    LOADING...
                  </div>
                </div>
              )}

              {/* Corner brackets - hidden on mobile */}
              <div className="hidden sm:block absolute top-6 left-6 w-8 h-8 border-l-2 border-t-2 border-amber-500/30" />
              <div className="hidden sm:block absolute top-6 right-6 w-8 h-8 border-r-2 border-t-2 border-amber-500/30" />
              <div className="hidden sm:block absolute bottom-20 left-6 w-8 h-8 border-l-2 border-b-2 border-amber-500/30" />
              <div className="hidden sm:block absolute bottom-20 right-6 w-8 h-8 border-r-2 border-b-2 border-amber-500/30" />

              <img
                src={image.cdn_url}
                alt={image.document_id}
                onLoad={() => setImageLoaded(true)}
                className={`max-w-full max-h-full object-contain shadow-2xl transition-all duration-500 ${
                  imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                }`}
              />
            </div>

            {/* Navigation & Actions */}
            <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-zinc-900/80 border-t border-zinc-800 backdrop-blur-sm">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={onPrev}
                  disabled={!hasPrev}
                  className="group flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:gap-2 sm:px-4 sm:py-2.5 font-mono text-xs bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:text-white hover:border-amber-500/50 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <ChevronLeft size={18} className="sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">PREV</span>
                </button>

                <button
                  onClick={onNext}
                  disabled={!hasNext}
                  className="group flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:gap-2 sm:px-4 sm:py-2.5 font-mono text-xs bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:text-white hover:border-amber-500/50 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <span className="hidden sm:inline">NEXT</span>
                  <ChevronRight size={18} className="sm:w-4 sm:h-4" />
                </button>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Info toggle - only on mobile */}
                <button
                  onClick={() => setShowInfo(true)}
                  className="lg:hidden flex items-center justify-center w-10 h-10 font-mono text-xs bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all duration-200"
                >
                  <FileText size={18} />
                </button>

                <a
                  href={image.cdn_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-2 px-4 py-2.5 font-mono text-xs bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-all duration-200"
                >
                  <ExternalLink size={14} />
                  OPEN
                </a>
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex items-center justify-center w-10 h-10 sm:w-auto sm:h-auto sm:gap-2 sm:px-4 sm:py-2.5 font-mono text-xs bg-amber-500/10 border border-amber-500 text-amber-500 hover:bg-amber-500/20 disabled:opacity-50 disabled:cursor-wait transition-all duration-200"
                >
                  {downloading ? (
                    <Loader2 size={16} className="sm:w-3.5 sm:h-3.5 animate-spin" />
                  ) : (
                    <Download size={16} className="sm:w-3.5 sm:h-3.5" />
                  )}
                  <span className="hidden sm:inline">{downloading ? 'DOWNLOADING...' : 'DOWNLOAD'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Info panel - full screen overlay on mobile when showInfo is true */}
          <div className={`flex flex-col overflow-hidden border-l border-zinc-800 bg-zinc-900/30 ${showInfo ? 'flex absolute inset-0 lg:relative lg:inset-auto' : 'hidden lg:flex'}`}>
            {/* Mobile back button */}
            <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
              <button
                onClick={() => setShowInfo(false)}
                className="flex items-center gap-2 font-mono text-xs text-zinc-400 hover:text-white"
              >
                <ChevronLeft size={16} />
                Back to Image
              </button>
              <span className="font-mono text-xs text-amber-500">{image.document_id}</span>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-800">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 sm:py-4 font-mono text-[10px] sm:text-xs tracking-wider transition-all duration-200 relative ${
                    activeTab === tab.id
                      ? 'text-amber-500 bg-zinc-900/50'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                  }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-amber-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'metadata' && (
                <div className="p-4 sm:p-5 space-y-4 sm:space-y-6 animate-fade-in">
                  {/* File info grid */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <MetaCard label="FILENAME" value={image.filename} />
                    <MetaCard label="DIMENSIONS" value={`${image.width} × ${image.height}`} />
                    <MetaCard label="FILE SIZE" value={formatFileSize(image.size_bytes)} />
                    <MetaCard label="FORMAT" value={image.format?.toUpperCase() || '—'} />
                  </div>

                  {/* Date section */}
                  {image.date_taken && (
                    <div className="p-3 sm:p-4 bg-blue-500/5 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={14} className="text-blue-400" />
                        <span className="font-mono text-[10px] text-blue-400 tracking-wider">DATE CAPTURED</span>
                      </div>
                      <p className="font-mono text-sm text-zinc-300">{image.date_taken}</p>
                    </div>
                  )}

                  {/* GPS section */}
                  {image.has_gps && image.exif && (
                    <div className="p-3 sm:p-4 bg-emerald-500/5 border border-emerald-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} className="text-emerald-400 animate-pulse" />
                          <span className="font-mono text-[10px] text-emerald-400 tracking-wider">GPS COORDINATES</span>
                        </div>
                        <button
                          onClick={() => copyToClipboard(
                            Object.entries(image.exif || {})
                              .filter(([k]) => k.includes('GPS'))
                              .map(([k, v]) => `${k}: ${v}`)
                              .join('\n')
                          )}
                          className="flex items-center gap-1 px-2 py-1 font-mono text-[10px] text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                        >
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                          {copied ? 'COPIED' : 'COPY'}
                        </button>
                      </div>
                      <div className="font-mono text-[11px] sm:text-xs bg-black/30 p-2 sm:p-3 border border-emerald-500/10 space-y-1">
                        {Object.entries(image.exif)
                          .filter(([k]) => k.includes('GPS'))
                          .map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-2">
                              <span className="text-zinc-500 truncate">{k}:</span>
                              <span className="text-emerald-300 text-right">{String(v)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Status badges */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <StatusBadge
                      active={image.has_gps}
                      label="GPS"
                      activeColor="emerald"
                    />
                    <StatusBadge
                      active={!!image.date_taken}
                      label="DATED"
                      activeColor="blue"
                    />
                    <StatusBadge
                      active={!!image.page_text && image.page_text.length > 10}
                      label="TEXT"
                      activeColor="violet"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'text' && (
                <div className="p-4 sm:p-5 animate-fade-in">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <span className="font-mono text-[10px] text-zinc-500 tracking-wider">
                      EXTRACTED TEXT
                    </span>
                    {image.page_text && (
                      <button
                        onClick={() => copyToClipboard(image.page_text || '')}
                        className="flex items-center gap-1 px-2 py-1 font-mono text-[10px] text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'COPIED' : 'COPY'}
                      </button>
                    )}
                  </div>
                  <div className="p-3 sm:p-4 bg-black/50 border border-zinc-800 min-h-[200px] sm:min-h-[300px]">
                    {image.page_text?.trim() ? (
                      <p className="font-mono text-xs sm:text-sm leading-relaxed text-zinc-400 whitespace-pre-wrap">
                        {image.page_text}
                      </p>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[150px] sm:h-[200px] text-center">
                        <FileText size={28} className="text-zinc-700 mb-3 sm:w-8 sm:h-8" />
                        <p className="font-mono text-xs sm:text-sm text-zinc-600">
                          No text extracted from this page.
                        </p>
                        <p className="font-mono text-[10px] sm:text-xs text-zinc-700 mt-1">
                          This may be an image-only document.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'exif' && (
                <div className="p-4 sm:p-5 animate-fade-in">
                  <span className="font-mono text-[10px] text-zinc-500 tracking-wider">
                    RAW EXIF DATA
                  </span>
                  <div className="mt-3 sm:mt-4 space-y-1">
                    {image.exif && Object.keys(image.exif).length > 0 ? (
                      Object.entries(image.exif).map(([key, value]) => (
                        <div
                          key={key}
                          className="group grid grid-cols-[100px_1fr] sm:grid-cols-[140px_1fr] gap-2 sm:gap-4 py-2 sm:py-2.5 px-2 sm:px-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                        >
                          <span className="font-mono text-[10px] sm:text-[11px] text-zinc-500 truncate">
                            {key}
                          </span>
                          <span className="font-mono text-[10px] sm:text-[11px] text-zinc-300 break-all group-hover:text-amber-400 transition-colors">
                            {String(value)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[150px] sm:h-[200px] text-center">
                        <Camera size={28} className="text-zinc-700 mb-3 sm:w-8 sm:h-8" />
                        <p className="font-mono text-xs sm:text-sm text-zinc-600">
                          No EXIF data available.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom border accent */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2.5 sm:p-3 bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700 transition-colors">
      <dt className="font-mono text-[9px] sm:text-[10px] text-zinc-600 tracking-wider mb-0.5 sm:mb-1">{label}</dt>
      <dd className="font-mono text-xs sm:text-sm text-zinc-300 truncate" title={value}>{value}</dd>
    </div>
  );
}

function StatusBadge({
  active,
  label,
  activeColor,
}: {
  active: boolean;
  label: string;
  activeColor: 'emerald' | 'blue' | 'violet' | 'amber';
}) {
  const colors = {
    emerald: active ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : '',
    blue: active ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : '',
    violet: active ? 'bg-violet-500/20 border-violet-500/50 text-violet-400' : '',
    amber: active ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : '',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] px-2 sm:px-2.5 py-1 border transition-colors ${
        active
          ? colors[activeColor]
          : 'bg-zinc-800/50 border-zinc-700 text-zinc-600'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-current' : 'bg-zinc-600'}`} />
      {label}
    </span>
  );
}
