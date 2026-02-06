'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, ExternalLink, MapPin, Calendar, Camera, FileText, Maximize2, Copy, Check, Loader2, Share2, X, Shield, Search } from 'lucide-react';
import { formatFileSize } from '@/lib/api';

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

type TabType = 'metadata' | 'text' | 'exif';

export function ImageDetailClient({ image }: { image: Image }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('metadata');
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [pageUrl, setPageUrl] = useState('');
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
    setPageUrl(window.location.href);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    setShowShareMenu(false);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const shareText = `Check out this declassified document: ${image.document_id} - Page ${image.page}`;

  const shareToTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(pageUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
    setShowShareMenu(false);
  };

  const shareToFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
    window.open(url, '_blank', 'width=550,height=420');
    setShowShareMenu(false);
  };

  const shareToWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + pageUrl)}`;
    window.open(url, '_blank');
    setShowShareMenu(false);
  };

  const shareToTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
    setShowShareMenu(false);
  };

  const shareToReddit = () => {
    const url = `https://reddit.com/submit?url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'width=550,height=420');
    setShowShareMenu(false);
  };

  const shareToEmail = () => {
    const subject = `Declassified Document: ${image.document_id}`;
    const body = `${shareText}\n\nView it here: ${pageUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setShowShareMenu(false);
  };

  const handleDownload = useCallback(async () => {
    if (downloading) return;

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
      window.open(image.cdn_url, '_blank');
    } finally {
      setDownloading(false);
    }
  }, [image, downloading]);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'metadata', label: 'METADATA', icon: <Camera size={14} /> },
    { id: 'text', label: 'DOCUMENT TEXT', icon: <FileText size={14} /> },
    { id: 'exif', label: 'EXIF DATA', icon: <Maximize2 size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100 flex flex-col">
      {/* Atmospheric overlays */}
      <div className="noise-overlay" />
      <div className="scanlines" />
      <div className="vignette" />

      {/* Main Header */}
      <header className="relative border-b border-zinc-800/50 overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 security-stripe opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/80 via-zinc-950/90 to-zinc-950" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className={`flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-8 transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {/* Title section */}
            <div>
              {/* Classification badge */}
              <div className="inline-flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500/10 border-2 border-red-500/30 shimmer-surface">
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
              <Link href="/" className="block">
                <h1 className="font-serif text-2xl sm:text-4xl font-semibold tracking-wide text-shadow-glow hover:opacity-80 transition-opacity">
                  <span className="text-gradient">EPSTEIN FILES</span>
                </h1>
              </Link>

              {/* Decorative separator */}
              <div className="flex items-center gap-2 mt-1.5 sm:mt-2">
                <div className="w-8 sm:w-12 h-px bg-gradient-to-r from-amber-500 to-transparent" />
                <div className="w-1 h-1 rotate-45 bg-amber-500/60" />
                <div className="w-12 sm:w-16 h-px bg-gradient-to-r from-amber-500/40 to-transparent" />
              </div>

              {/* Subtitle */}
              <p className="font-mono text-[10px] sm:text-xs text-zinc-500 tracking-[0.2em] sm:tracking-[0.3em] mt-1 sm:mt-2">
                DOCUMENT & IMAGE ARCHIVE
              </p>
            </div>

            {/* Search bar */}
            <div className="w-full lg:w-auto lg:min-w-[300px]">
              <form onSubmit={handleSearch} className="relative group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 transition-colors group-focus-within:text-amber-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search documents..."
                  className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-zinc-900/50 border border-zinc-800 font-mono text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 focus:bg-zinc-900 transition-all duration-300 search-focus-ring"
                />
                {/* Bottom glow line on focus */}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                {/* Ambient blur */}
                <div className="absolute inset-0 -z-10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300">
                  <div className="absolute inset-0 bg-amber-500/5 blur-xl" />
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Bottom accent */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
      </header>

      {/* Document Navigation Bar — glass morphism */}
      <div className="border-b border-zinc-800/50 glass-surface sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="group flex items-center gap-2 font-mono text-xs text-zinc-400 hover:text-amber-500 transition-colors"
              >
                <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-1" />
                <span className="hidden sm:inline">Gallery</span>
              </Link>
              <div className="w-px h-5 bg-zinc-800" />
              {/* Connected document ID + page badges */}
              <div className="flex items-center gap-0">
                <span className="font-mono text-sm font-semibold px-3 py-1.5 bg-amber-500/10 border border-amber-500 text-amber-500 border-r-0">
                  {image.document_id}
                </span>
                <span className="font-mono text-sm px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-zinc-400">
                  PAGE {image.page}
                </span>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowShareMenu(!showShareMenu)}
                className="flex items-center gap-2 px-3 py-2 font-mono text-xs bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
              >
                {linkCopied ? <Check size={14} /> : <Share2 size={14} />}
                <span className="hidden sm:inline">{linkCopied ? 'COPIED!' : 'SHARE'}</span>
              </button>

              {/* Share dropdown menu — backdrop blur + top amber glow */}
              {showShareMenu && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowShareMenu(false)}
                  />

                  {/* Menu */}
                  <div className="absolute right-0 top-full mt-2 w-48 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 shadow-xl z-50 animate-fade-in edge-highlight">
                    <div className="p-1">
                      <button
                        onClick={shareToTwitter}
                        className="w-full flex items-center gap-3 px-3 py-2.5 font-mono text-xs text-zinc-300 hover:bg-amber-500/10 hover:text-white transition-colors"
                      >
                        <XIcon />
                        Share on X
                      </button>
                      <button
                        onClick={shareToFacebook}
                        className="w-full flex items-center gap-3 px-3 py-2.5 font-mono text-xs text-zinc-300 hover:bg-amber-500/10 hover:text-white transition-colors"
                      >
                        <FacebookIcon />
                        Share on Facebook
                      </button>
                      <button
                        onClick={shareToWhatsApp}
                        className="w-full flex items-center gap-3 px-3 py-2.5 font-mono text-xs text-zinc-300 hover:bg-amber-500/10 hover:text-white transition-colors"
                      >
                        <WhatsAppIcon />
                        Share on WhatsApp
                      </button>
                      <button
                        onClick={shareToTelegram}
                        className="w-full flex items-center gap-3 px-3 py-2.5 font-mono text-xs text-zinc-300 hover:bg-amber-500/10 hover:text-white transition-colors"
                      >
                        <TelegramIcon />
                        Share on Telegram
                      </button>
                      <button
                        onClick={shareToReddit}
                        className="w-full flex items-center gap-3 px-3 py-2.5 font-mono text-xs text-zinc-300 hover:bg-amber-500/10 hover:text-white transition-colors"
                      >
                        <RedditIcon />
                        Share on Reddit
                      </button>
                      <div className="my-1 border-t border-zinc-800" />
                      <button
                        onClick={shareToEmail}
                        className="w-full flex items-center gap-3 px-3 py-2.5 font-mono text-xs text-zinc-300 hover:bg-amber-500/10 hover:text-white transition-colors"
                      >
                        <EmailIcon />
                        Share via Email
                      </button>
                      <button
                        onClick={shareLink}
                        className="w-full flex items-center gap-3 px-3 py-2.5 font-mono text-xs text-zinc-300 hover:bg-amber-500/10 hover:text-white transition-colors"
                      >
                        <Copy size={14} />
                        Copy Link
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
          {/* Image section */}
          <div className="space-y-4">
            <div className="relative bg-black border border-zinc-800 p-4 sm:p-6 ambient-glow">
              {/* Refined 1px corner brackets */}
              <div className="absolute top-3 left-3 w-5 h-5 border-l border-t border-amber-500/30" />
              <div className="absolute top-3 right-3 w-5 h-5 border-r border-t border-amber-500/30" />
              <div className="absolute bottom-3 left-3 w-5 h-5 border-l border-b border-amber-500/30" />
              <div className="absolute bottom-3 right-3 w-5 h-5 border-r border-b border-amber-500/30" />

              {/* Document number overlay — subtle, top center */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10">
                <span className="font-mono text-[9px] text-zinc-600/50 tracking-widest">
                  {image.document_id} / P{image.page}
                </span>
              </div>

              <img
                src={image.cdn_url}
                alt={`Document ${image.document_id} - Page ${image.page}`}
                className="w-full h-auto max-h-[70vh] object-contain mx-auto drop-shadow-[0_4px_20px_rgba(0,0,0,0.5)]"
              />

              {/* DECLASSIFIED watermark — bottom right, very faint */}
              <div className="absolute bottom-4 right-4 z-10 pointer-events-none">
                <span className="font-mono text-[8px] tracking-[0.3em] text-red-500/10 rotate-0">
                  DECLASSIFIED
                </span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <a
                href={image.cdn_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 font-mono text-xs bg-zinc-800/50 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors"
              >
                <ExternalLink size={14} />
                OPEN FULL SIZE
              </a>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 font-mono text-xs bg-amber-500/10 border border-amber-500 text-amber-500 hover:bg-amber-500/20 disabled:opacity-50 transition-colors"
              >
                {downloading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} />
                )}
                {downloading ? 'DOWNLOADING...' : 'DOWNLOAD'}
              </button>
            </div>
          </div>

          {/* Info panel */}
          <div className="bg-zinc-900/30 border border-zinc-800">
            {/* Tabs — active icon scales up, gradient underline, background tint */}
            <div className="flex border-b border-zinc-800">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 font-mono text-xs tracking-wider transition-all relative ${
                    activeTab === tab.id
                      ? 'text-amber-500 bg-amber-500/5'
                      : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30'
                  }`}
                >
                  <span className={`transition-transform ${activeTab === tab.id ? 'scale-110' : ''}`}>
                    {tab.icon}
                  </span>
                  <span className="hidden sm:inline">{tab.label}</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/50 via-amber-500 to-amber-500/50 animate-tab-underline" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5 overflow-y-auto max-h-[60vh]">
              {activeTab === 'metadata' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-2 gap-4">
                    <MetaCard label="FILENAME" value={image.filename} />
                    <MetaCard label="DIMENSIONS" value={`${image.width} × ${image.height} px`} />
                    <MetaCard label="FILE SIZE" value={formatFileSize(image.size_bytes)} />
                    <MetaCard label="FORMAT" value={image.format?.toUpperCase() || '—'} />
                  </div>

                  {image.date_taken && (
                    <div className="p-4 bg-blue-500/5 border border-blue-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar size={14} className="text-blue-400" />
                        <span className="font-mono text-[10px] text-blue-400 tracking-wider">DATE CAPTURED</span>
                      </div>
                      <p className="font-mono text-sm text-zinc-300">{image.date_taken}</p>
                    </div>
                  )}

                  {image.has_gps && image.exif && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20">
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
                      <div className="font-mono text-xs bg-black/30 p-3 border border-emerald-500/10 space-y-1">
                        {Object.entries(image.exif)
                          .filter(([k]) => k.includes('GPS'))
                          .map(([k, v]) => (
                            <div key={k} className="flex justify-between">
                              <span className="text-zinc-500">{k}:</span>
                              <span className="text-emerald-300">{String(v)}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-2">
                    <StatusBadge active={image.has_gps} label="GPS" color="emerald" />
                    <StatusBadge active={!!image.date_taken} label="DATED" color="blue" />
                    <StatusBadge active={!!image.page_text && image.page_text.length > 10} label="TEXT" color="violet" />
                  </div>
                </div>
              )}

              {activeTab === 'text' && (
                <div className="animate-fade-in">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-[10px] text-zinc-500 tracking-wider">
                      EXTRACTED DOCUMENT TEXT
                    </span>
                    {image.page_text && (
                      <button
                        onClick={() => copyToClipboard(image.page_text || '')}
                        className="flex items-center gap-1 px-2 py-1 font-mono text-[10px] text-zinc-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                      >
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        {copied ? 'COPIED' : 'COPY ALL'}
                      </button>
                    )}
                  </div>
                  <div className="p-4 bg-black/50 border border-zinc-800 min-h-[300px]">
                    {image.page_text?.trim() ? (
                      <p className="font-mono text-sm leading-relaxed text-zinc-400 whitespace-pre-wrap">
                        {image.page_text}
                      </p>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[200px] text-center">
                        <FileText size={32} className="text-zinc-700 mb-3" />
                        <p className="font-mono text-sm text-zinc-600">No text extracted from this page.</p>
                        <p className="font-mono text-xs text-zinc-700 mt-1">This may be an image-only document.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'exif' && (
                <div className="animate-fade-in">
                  <span className="font-mono text-[10px] text-zinc-500 tracking-wider">RAW EXIF DATA</span>
                  <div className="mt-4 space-y-1">
                    {image.exif && Object.keys(image.exif).length > 0 ? (
                      Object.entries(image.exif).map(([key, value]) => (
                        <div
                          key={key}
                          className="group grid grid-cols-[140px_1fr] gap-4 py-2.5 px-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors"
                        >
                          <span className="font-mono text-[11px] text-zinc-500 truncate group-hover:text-zinc-400 transition-colors">{key}</span>
                          <span className="font-mono text-[11px] text-zinc-300 break-all group-hover:text-amber-400 transition-colors">
                            {String(value)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[200px] text-center">
                        <Camera size={32} className="text-zinc-700 mb-3" />
                        <p className="font-mono text-sm text-zinc-600">No EXIF data available.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer — matches homepage */}
      <footer className="relative border-t border-zinc-800/50 bg-zinc-950 mt-auto overflow-hidden">
        {/* Security stripe background */}
        <div className="absolute inset-0 security-stripe opacity-40" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
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
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                ARCHIVE ONLINE
              </span>
              <span className="text-zinc-700">|</span>
              <span>DATA SOURCE: justice.gov/epstein</span>
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-500">
                v1.0
              </span>
            </div>
          </div>

          {/* HR amber divider */}
          <div className="hr-amber mb-4 sm:mb-6" />

          {/* Branding */}
          <div className="flex flex-col items-center gap-3">
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

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="group p-3 bg-zinc-800/30 border border-zinc-800 hover:border-zinc-700 transition-all duration-200">
      <dt className="font-mono text-[10px] text-zinc-600 tracking-wider mb-1 group-hover:text-zinc-500 transition-colors">{label}</dt>
      <dd className="font-mono text-sm text-zinc-300 truncate group-hover:text-zinc-200 transition-colors" title={value}>{value}</dd>
    </div>
  );
}

function StatusBadge({ active, label, color }: { active: boolean; label: string; color: string }) {
  const colorClasses: Record<string, string> = {
    emerald: active ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : '',
    blue: active ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : '',
    violet: active ? 'bg-violet-500/20 border-violet-500/50 text-violet-400' : '',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] px-2.5 py-1 border transition-colors ${
        active ? colorClasses[color] : 'bg-zinc-800/50 border-zinc-700 text-zinc-600'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-current' : 'bg-zinc-600'}`} />
      {label}
    </span>
  );
}

// Social media icons
function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function RedditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
