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
          className={`relative w-full max-w-md sm:max-w-lg p-10 sm:p-14 rounded-3xl transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-6 text-center group overflow-hidden border backdrop-blur-2xl ${
            isDragOver
              ? 'border-white/40 bg-white/[0.08] scale-[1.02] shadow-[inset_0_1px_2px_rgba(255,255,255,0.3),0_30px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(59,130,246,0.2)]'
              : 'border-white/10 hover:border-white/25 bg-gradient-to-b from-white/[0.07] via-white/[0.03] to-white/[0.01] hover:bg-white/[0.06] shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_20px_50px_rgba(0,0,0,0.8)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_25px_60px_rgba(0,0,0,0.9),0_0_35px_rgba(59,130,246,0.1)]'
          }`}
        >
          {/* Subtle Glass Sheen Top Layer */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] via-transparent to-transparent pointer-events-none rounded-3xl" />

          {/* Glowing Icon */}
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-white text-black flex items-center justify-center group-hover:scale-105 group-active:scale-95 transition-all duration-300 shadow-xl shadow-white/10">
            <Upload className="w-8 h-8 sm:w-9 sm:h-9 stroke-[2.2]" />
          </div>

          <div className="relative">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white block drop-shadow-sm">
              Choose WebP or GIF
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
