import React, { useState } from 'react';
import { Trash2, Archive, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import { QueueItem } from './ConversionItemCard';

interface BatchActionBarProps {
  items: QueueItem[];
  onConvertAll: () => void;
  onClearAll: () => void;
  onClearCompleted: () => void;
  isProcessing: boolean;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  items,
  onClearAll,
}) => {
  const [isZipping, setIsZipping] = useState(false);
  const completedItems = items.filter((i) => i.status === 'completed' && i.result);

  const handleDownloadZip = async () => {
    if (completedItems.length === 0) return;
    setIsZipping(true);
    try {
      const zip = new JSZip();
      for (const item of completedItems) {
        if (item.result) {
          const baseName = item.file.name.substring(0, item.file.name.lastIndexOf('.')) || item.file.name;
          zip.file(`${baseName}.mp4`, item.result.blob);
        }
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(zipBlob);
      a.download = `converted_mp4_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error('Failed to create ZIP package:', err);
    } finally {
      setIsZipping(false);
    }
  };

  if (items.length <= 1) return null;

  return (
    <div className="flex items-center justify-between px-2 py-1 text-xs text-neutral-400">
      <span className="font-medium text-white">
        {items.length} files
      </span>

      <div className="flex items-center gap-2">
        {completedItems.length > 1 && (
          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-1.5 px-3 py-1.5 font-bold text-white bg-blue-500 hover:bg-blue-400 disabled:opacity-50 rounded-xl transition-all cursor-pointer shadow-sm shadow-blue-500/20"
          >
            {isZipping ? <Loader2 className="w-3 h-3 animate-spin" /> : <Archive className="w-3 h-3" />}
            <span>Download all (.zip)</span>
          </button>
        )}

        <button
          onClick={onClearAll}
          className="flex items-center gap-1 p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
          title="Clear all"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
