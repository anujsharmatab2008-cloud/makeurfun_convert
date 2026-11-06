import React, { useState, useEffect } from 'react';
import {
  FileVideo,
  Download,
  Trash2,
  Eye,
  Loader2,
  Plus,
} from 'lucide-react';
import { ConversionProgress, ConversionResult } from '../converter/converterEngine';

export interface QueueItem {
  id: string;
  file: File;
  status: 'idle' | 'converting' | 'completed' | 'error';
  progress?: ConversionProgress;
  result?: ConversionResult;
  errorMessage?: string;
}

interface ConversionItemCardProps {
  item: QueueItem;
  onConvert: (id: string) => void;
  onRemove: (id: string) => void;
  onCompare: (item: QueueItem) => void;
  isProcessing: boolean;
  variant?: 'hero' | 'row';
  onAddMore?: () => void;
}

export const ConversionItemCard: React.FC<ConversionItemCardProps> = ({
  item,
  onConvert,
  onRemove,
  onCompare,
  isProcessing,
  variant = 'row',
  onAddMore,
}) => {
  const [thumbUrl, setThumbUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(item.file);
    setThumbUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [item.file]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const cleanName = item.file.name.replace(/\.[^/.]+$/, '');

  const handleDownload = () => {
    if (!item.result) return;
    const a = document.createElement('a');
    a.href = item.result.url;
    a.download = `${cleanName}.mp4`;
    a.click();
  };

  // Hero Showcase Card (Single File Focused View)
  if (variant === 'hero') {
    return (
      <div className="relative w-full max-w-sm sm:max-w-md mx-auto bg-gradient-to-b from-neutral-900/80 via-neutral-950/90 to-black/95 border border-white/[0.12] backdrop-blur-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),inset_0_1px_1px_rgba(255,255,255,0.12)] rounded-3xl p-5 sm:p-6 flex flex-col items-center gap-4 transition-all duration-200 overflow-hidden">
        {/* Subtle Top Specular Sheen Line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

        {/* Compact Video / Image Preview with WhatsApp sticker frame */}
        <div className="w-full aspect-square max-h-56 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-inner flex items-center justify-center relative">
          {item.status === 'completed' && item.result ? (
            <video
              src={item.result.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain"
            />
          ) : item.status === 'converting' ? (
            <div className="flex flex-col items-center gap-3 text-neutral-400">
              <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
              <span className="text-xs font-mono text-neutral-300">
                {item.progress?.percent || 0}%
              </span>
            </div>
          ) : thumbUrl ? (
            <img src={thumbUrl} alt={item.file.name} className="w-full h-full object-contain" />
          ) : (
            <FileVideo className="w-10 h-10 text-neutral-600" />
          )}
        </div>

        {/* Progress Bar (while encoding) */}
        {item.status === 'converting' && (
          <div className="w-full bg-neutral-900 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-150 rounded-full"
              style={{ width: `${item.progress?.percent || 0}%` }}
            />
          </div>
        )}

        {/* Error Feedback */}
        {item.status === 'error' && (
          <p className="text-xs text-rose-400 text-center">
            {item.errorMessage || 'Conversion failed'}
          </p>
        )}

        {/* File Name & Converted Dimensions / Size */}
        <div className="w-full flex items-center justify-between px-1">
          <span className="font-semibold text-sm sm:text-base text-white truncate max-w-[200px]">
            {cleanName}.mp4
          </span>
          {item.result && (
            <span className="text-xs font-mono text-blue-300 tabular-nums bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
              {item.result.width}×{item.result.height} · {formatBytes(item.result.fileSize)}
            </span>
          )}
        </div>

        {/* Primary Download Action & Secondary Controls */}
        {item.status === 'completed' && item.result && (
          <div className="w-full flex items-center gap-2 pt-1">
            <button
              onClick={handleDownload}
              className="flex-1 py-3 px-5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/30 active:scale-[0.99]"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>Download MP4</span>
            </button>

            <button
              onClick={() => onCompare(item)}
              className="p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Compare"
            >
              <Eye className="w-4 h-4" />
            </button>

            <button
              onClick={() => onRemove(item.id)}
              className="p-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Convert Another File Action */}
        {onAddMore && (
          <button
            onClick={onAddMore}
            className="text-xs text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5 pt-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Convert another</span>
          </button>
        )}
      </div>
    );
  }

  // Row Variant (Multi-File List View)
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 transition-colors hover:border-neutral-700">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-12 h-12 rounded-xl bg-neutral-900 overflow-hidden shrink-0 border border-neutral-800 flex items-center justify-center">
          {item.status === 'completed' && item.result ? (
            <video
              src={item.result.url}
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            />
          ) : thumbUrl ? (
            <img src={thumbUrl} alt={item.file.name} className="w-full h-full object-cover" />
          ) : (
            <FileVideo className="w-5 h-5 text-neutral-600" />
          )}
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-white truncate max-w-[180px] sm:max-w-[260px]">
            {cleanName}.mp4
          </h4>
          <span className="text-xs text-neutral-400 font-mono tabular-nums">
            {item.result ? `${item.result.width}×${item.result.height} · ${formatBytes(item.result.fileSize)}` : formatBytes(item.file.size)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.status === 'converting' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span className="font-mono tabular-nums">{item.progress?.percent || 0}%</span>
          </div>
        )}

        {item.status === 'completed' && item.result && (
          <>
            <button
              onClick={() => onCompare(item)}
              className="p-2 text-neutral-400 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-xl transition-colors cursor-pointer"
              title="Compare"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-blue-500 hover:bg-blue-400 rounded-xl transition-all cursor-pointer shadow-md shadow-blue-500/20"
              title="Download MP4"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Download</span>
            </button>
          </>
        )}

        <button
          onClick={() => onRemove(item.id)}
          disabled={item.status === 'converting'}
          className="p-2 text-neutral-500 hover:text-rose-400 rounded-lg hover:bg-neutral-900 disabled:opacity-30 transition-colors cursor-pointer"
          title="Remove"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
