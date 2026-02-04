import Link from 'next/link';
import { FileX } from 'lucide-react';

export default function ImageNotFound() {
  return (
    <div className="min-h-screen bg-[#050506] text-zinc-100 flex items-center justify-center">
      <div className="text-center px-4">
        <div className="w-20 h-20 mx-auto mb-6 border-2 border-dashed border-zinc-800 rounded-full flex items-center justify-center">
          <FileX size={32} className="text-zinc-700" />
        </div>
        <h1 className="font-mono text-lg text-zinc-400 tracking-wider mb-2">
          IMAGE NOT FOUND
        </h1>
        <p className="text-zinc-600 text-sm max-w-md mx-auto mb-8">
          The requested document image could not be found. It may have been removed or the link is invalid.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 font-mono text-xs bg-amber-500/10 border border-amber-500 text-amber-500 hover:bg-amber-500/20 transition-colors"
        >
          ← BACK TO GALLERY
        </Link>
      </div>
    </div>
  );
}
