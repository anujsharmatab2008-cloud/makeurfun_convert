import React, { useRef, useState, useEffect } from 'react';
import { X, Play, Pause, RotateCcw, Download, Check } from 'lucide-react';
import { ConversionResult } from '../converter/converterEngine';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalFile: File;
  result: ConversionResult;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({
  isOpen,
  onClose,
  originalFile,
  result,
}) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [originalUrl, setOriginalUrl] = useState<string>('');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (originalFile) {
      const url = URL.createObjectURL(originalFile);
      setOriginalUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [originalFile]);

  if (!isOpen) return null;

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = result.url;
    const baseName = originalFile.name.substring(0, originalFile.name.lastIndexOf('.')) || originalFile.name;
    a.download = `${baseName}.mp4`;
    a.click();
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isGif = originalFile.name.toLowerCase().endsWith('.gif');
  const formatName = isGif ? 'GIF' : 'WebP';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl bg-neutral-950 rounded-3xl shadow-2xl border border-neutral-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <div>
            <h3 className="text-base font-bold text-white">
              Side-by-Side Comparison
            </h3>
            <p className="text-xs text-neutral-400">
              {originalFile.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Side by Side */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Original */}
            <div className="flex flex-col bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-neutral-300">
                  Original Source ({formatName})
                </span>
                <span className="font-mono text-neutral-400 tabular-nums">
                  {formatBytes(result.originalSize)}
                </span>
              </div>

              <div className="flex-1 flex items-center justify-center min-h-[260px] bg-black/60 rounded-xl overflow-hidden border border-neutral-800/80 relative">
                {originalUrl ? (
                  <img
                    ref={imgRef}
                    src={originalUrl}
                    alt="Original Animation"
                    className="max-h-[340px] max-w-full object-contain"
                  />
                ) : (
                  <div className="text-xs text-neutral-500">Loading original...</div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                <span>Standard Container</span>
                <span className="font-mono tabular-nums">{result.width} × {result.height} px</span>
              </div>
            </div>

            {/* Right: Output MP4 */}
            <div className="flex flex-col bg-neutral-900/60 rounded-2xl p-4 border border-neutral-800">
              <div className="flex items-center justify-between mb-3 text-xs">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Encoded Video (H.264 MP4)
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-white tabular-nums">
                    {formatBytes(result.fileSize)}
                  </span>
                  {result.savedPercentage > 0 && (
                    <span className="font-mono text-emerald-400 font-semibold tabular-nums">
                      (-{result.savedPercentage}%)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex-1 flex items-center justify-center min-h-[260px] bg-black/60 rounded-xl overflow-hidden border border-neutral-800/80 relative">
                <video
                  ref={videoRef}
                  src={result.url}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="max-h-[340px] max-w-full object-contain"
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-neutral-500">
                <span>Constrained Baseline H.264</span>
                <span className="font-mono tabular-nums">{result.width} × {result.height} px · {result.durationSeconds}s</span>
              </div>
            </div>
          </div>

          {/* Sync Playback Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-3 bg-neutral-900/50 rounded-xl border border-neutral-800 text-xs text-neutral-300">
            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition-colors"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <button
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = 0;
                    videoRef.current.play();
                    setIsPlaying(true);
                  }
                  if (imgRef.current && originalUrl) {
                    imgRef.current.src = originalUrl;
                  }
                }}
                className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                title="Restart loop"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-neutral-400">Speed:</span>
              {[0.5, 1, 1.5, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => handleSpeedChange(s)}
                  className={`px-2 py-0.5 rounded text-xs font-mono transition-colors ${
                    playbackSpeed === s
                      ? 'bg-white text-black font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-950">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 transition-colors"
          >
            Close
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-black bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-md shadow-emerald-500/10"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download MP4</span>
          </button>
        </div>
      </div>
    </div>
  );
};
