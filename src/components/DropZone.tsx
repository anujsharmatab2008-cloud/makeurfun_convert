import React, { useRef, useState, useEffect } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  variant?: 'hero' | 'sidebar' | 'compact';
}

export const DropZone: React.FC<DropZoneProps> = ({
  onFilesSelected,
  disabled = false,
  variant = 'hero',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragError, setDragError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (rawFiles: FileList | File[]) => {
    const validFiles: File[] = [];
    const invalidNames: string[] = [];

    Array.from(rawFiles).forEach((file) => {
      const ext = file.name.toLowerCase();
      const mime = file.type.toLowerCase();
      if (
        ext.endsWith('.gif') ||
        ext.endsWith('.webp') ||
        mime === 'image/gif' ||
        mime === 'image/webp'
      ) {
        validFiles.push(file);
      } else {
        invalidNames.push(file.name);
      }
    });

    if (invalidNames.length > 0) {
      setDragError('Please select a valid .webp or .gif animation file');
      setTimeout(() => setDragError(null), 4000);
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
        processFiles(e.clipboardData.files);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [disabled]);

  const handleManualSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <input
        ref={fileInputRef}
        type="file"
        accept=".gif,.webp,image/gif,image/webp"
        multiple
        onChange={handleManualSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* Hero Variant: Big centered upload button with premium glassy look */}
      {variant === 'hero' && (
        <button
          type="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative w-full max-w-md sm:max-w-[480px] p-8 sm:p-10 rounded-3xl transition-all duration-300 cursor-pointer flex flex-col items-center justify-center text-center group overflow-hidden border backdrop-blur-2xl ${
            isDragOver
              ? 'border-blue-500/60 bg-blue-500/[0.08] scale-[1.02] shadow-[0_25px_60px_-10px_rgba(59,130,246,0.35),inset_0_1px_1px_rgba(255,255,255,0.3)]'
              : 'border-white/[0.12] hover:border-blue-500/40 bg-gradient-to-b from-neutral-900/80 via-neutral-950/90 to-black/95 hover:bg-neutral-900/90 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.12)] hover:shadow-[0_30px_70px_-10px_rgba(59,130,246,0.22),inset_0_1px_1px_rgba(255,255,255,0.2)]'
          }`}
        >
          {/* Subtle Top Specular Sheen Line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

          {/* Ambient Blue Radial Glow behind icon */}
          <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-44 h-44 bg-blue-500/15 rounded-full blur-3xl group-hover:bg-blue-500/25 transition-all duration-500 pointer-events-none" />

          {/* Refined Electric-Blue Glass Icon */}
          <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-gradient-to-b from-blue-500/20 via-blue-500/10 to-blue-600/5 border border-blue-400/30 text-blue-400 flex items-center justify-center group-hover:scale-105 group-hover:text-blue-300 group-hover:border-blue-400/60 transition-all duration-300 shadow-[0_0_28px_rgba(59,130,246,0.25)] group-hover:shadow-[0_0_36px_rgba(59,130,246,0.4)]">
            <Upload className="w-7 h-7 sm:w-8 sm:h-8 stroke-[2.2] group-hover:-translate-y-0.5 transition-transform duration-200" />
          </div>

          {/* Clean Typography */}
          <div className="relative mt-5">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white group-hover:text-white transition-colors">
              Choose WebP or GIF
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 font-normal mt-1.5">
              or drag & drop your animation file
            </p>
          </div>

          {/* Subtle Hairline Divider */}
          <div className="w-full h-px bg-white/[0.07] my-5" />

          {/* Professional Format Badges */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[11px] font-medium text-neutral-400 select-none">
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-neutral-300">
              WhatsApp Sticker Ready
            </span>
            <span className="text-neutral-600">·</span>
            <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-neutral-300 font-mono">
              512 × 512
            </span>
            <span className="text-neutral-600">·</span>
            <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-neutral-300 font-mono">
              &lt; 500 KB
            </span>
          </div>
        </button>
      )}

      {/* Sidebar Variant: Drop container in multi-item view */}
      {variant === 'sidebar' && (
        <button
          type="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full h-44 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-3 text-center group backdrop-blur-xl ${
            isDragOver
              ? 'border-white/30 bg-white/[0.08] scale-[1.01]'
              : 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.05]'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center group-hover:scale-105 transition-all">
            <Upload className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="text-sm font-bold text-white block">
              Add more files
            </span>
          </div>
        </button>
      )}

      {/* Compact Variant */}
      {variant === 'compact' && (
        <button
          type="button"
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`w-full p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer flex items-center justify-center gap-3 text-center group backdrop-blur-xl ${
            isDragOver
              ? 'border-white/30 bg-white/[0.08] scale-[1.01]'
              : 'border-white/10 hover:border-white/20 bg-white/[0.03] hover:bg-white/[0.05]'
          }`}
        >
          <div className="w-8 h-8 rounded-lg bg-white text-black flex items-center justify-center group-hover:scale-105 transition-all shrink-0">
            <Upload className="w-4 h-4 stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-white">
            Add more files
          </span>
        </button>
      )}

      {dragError && (
        <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-1.5 bg-neutral-950 border border-rose-900/80 rounded-xl text-xs text-rose-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{dragError}</span>
        </div>
      )}
    </div>
  );
};
