import React from 'react';

export const TopBar: React.FC = () => {
  return (
    <header className="h-[72px] shrink-0 px-6 sm:px-8 flex items-center justify-between bg-black border-b border-white/[0.06]">
      <div className="flex items-center gap-3.5">
        {/* Prominent makeurfun brand icon */}
        <div className="w-12 h-12 rounded-2xl overflow-hidden bg-black border border-white/10 shadow-[0_0_20px_rgba(59,130,246,0.25)] flex items-center justify-center shrink-0">
          <img
            src="/assets/aistudio/image_01cb2392.png"
            alt="makeurfun"
            className="w-full h-full object-cover scale-[1.28] transform-gpu"
          />
        </div>

        {/* Prominent, bold brand mark */}
        <span className="text-2xl sm:text-[26px] font-black tracking-tight text-white antialiased select-none">
          makeurfun
        </span>
      </div>
    </header>
  );
};
