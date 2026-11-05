import React from 'react';

export const TopBar: React.FC = () => {
  return (
    <header className="h-14 shrink-0 px-6 flex items-center justify-between bg-black border-b border-neutral-900">
      <div className="flex items-center gap-3">
        {/* Full, edge-to-edge cropped makeurfun brand logo */}
        <div className="w-8 h-8 rounded-xl overflow-hidden bg-black flex items-center justify-center shrink-0 border border-blue-500/25 shadow-sm shadow-blue-500/20">
          <img
            src="/assets/aistudio/image_01cb2392.png"
            alt="makeurfun logo"
            className="w-full h-full object-cover scale-[1.3] transform-gpu"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-extrabold tracking-tight text-white">
            makeurfun
          </span>
          <span className="text-neutral-700 text-xs select-none">·</span>
          <span className="text-xs text-neutral-400 font-medium">
            WebP & GIF to MP4
          </span>
        </div>
      </div>
    </header>
  );
};
