import React, { useState, useRef, useEffect } from 'react';
import { TopBar } from './components/TopBar';
import { DropZone } from './components/DropZone';
import { ConversionItemCard, QueueItem } from './components/ConversionItemCard';
import { BatchActionBar } from './components/BatchActionBar';
import { ComparisonModal } from './components/ComparisonModal';
import { convertToMp4, ConversionOptions } from './converter/converterEngine';
import { Plus } from 'lucide-react';

const HIGH_QUALITY_OPTIONS: ConversionOptions = {
  fps: 'auto',
  scale: 60, // Reduced to 60% dimensions
  quality: 'high', // High visual quality
  loopCount: 1,
  playbackSpeed: 1.0,
  reverseMode: 'normal',
  bgColor: 'black',
};

export default function App() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [comparingItem, setComparingItem] = useState<QueueItem | null>(null);
  const [isGlobalDragging, setIsGlobalDragging] = useState(false);
  const globalInputRef = useRef<HTMLInputElement>(null);

  const handleConvertItem = async (id: string, file: File) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: 'converting',
              errorMessage: undefined,
              progress: {
                phase: 'parsing',
                percent: 0,
                stageMessage: 'Converting...',
              },
            }
          : item
      )
    );

    setIsProcessing(true);

    try {
      const result = await convertToMp4(file, HIGH_QUALITY_OPTIONS, (progress) => {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, progress } : item))
        );
      });

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'completed',
                result,
                progress: {
                  phase: 'complete',
                  percent: 100,
                  stageMessage: 'Completed',
                },
              }
            : item
        )
      );
    } catch (err: any) {
      console.error('Conversion failed for item:', id, err);
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: 'error',
                errorMessage: err.message || 'Conversion failed.',
              }
            : item
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilesSelected = async (files: File[]) => {
    const newItems: QueueItem[] = files.map((file) => ({
      id: `${file.name}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      status: 'idle',
    }));

    setItems((prev) => [...newItems, ...prev]);

    for (const newItem of newItems) {
      await handleConvertItem(newItem.id, newItem.file);
    }
  };

  const handleConvertAll = async () => {
    const pending = items.filter((i) => i.status === 'idle');
    if (pending.length === 0) return;

    setIsProcessing(true);
    for (const item of pending) {
      await handleConvertItem(item.id, item.file);
    }
    setIsProcessing(false);
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => {
      const found = prev.find((i) => i.id === id);
      if (found?.result?.url) {
        URL.revokeObjectURL(found.result.url);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const handleClearAll = () => {
    items.forEach((item) => {
      if (item.result?.url) URL.revokeObjectURL(item.result.url);
    });
    setItems([]);
  };

  const handleClearCompleted = () => {
    setItems((prev) => {
      const remaining: QueueItem[] = [];
      prev.forEach((item) => {
        if (item.status === 'completed') {
          if (item.result?.url) URL.revokeObjectURL(item.result.url);
        } else {
          remaining.push(item);
        }
      });
      return remaining;
    });
  };

  // Global window drop handler for frictionless file drop
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsGlobalDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      if (e.clientX === 0 && e.clientY === 0) {
        setIsGlobalDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsGlobalDragging(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const validFiles = Array.from(e.dataTransfer.files).filter(
          (f) =>
            f.name.toLowerCase().endsWith('.gif') ||
            f.name.toLowerCase().endsWith('.webp') ||
            f.type === 'image/gif' ||
            f.type === 'image/webp'
        );
        if (validFiles.length > 0) {
          handleFilesSelected(validFiles);
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <div className="h-screen max-h-screen w-screen flex flex-col bg-black text-white selection:bg-neutral-800 selection:text-white overflow-hidden">
      {/* Hidden file input for convert another file button */}
      <input
        ref={globalInputRef}
        type="file"
        accept=".gif,.webp,image/gif,image/webp"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesSelected(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
        className="hidden"
      />

      {/* Header */}
      <TopBar />

      {/* Main Viewport Container */}
      <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden relative">
        {/* Fullscreen Drop Overlay */}
        {isGlobalDragging && (
          <div className="absolute inset-4 z-40 bg-neutral-950/90 border-2 border-dashed border-white rounded-3xl flex items-center justify-center backdrop-blur-xs pointer-events-none">
            <span className="text-lg font-bold text-white">Drop file to convert</span>
          </div>
        )}

        {items.length === 0 ? (
          /* Empty / Initial Screen: Centered glassy upload button */
          <div className="w-full max-w-md sm:max-w-lg flex items-center justify-center">
            <DropZone
              onFilesSelected={handleFilesSelected}
              disabled={isProcessing}
              variant="hero"
            />
          </div>
        ) : items.length === 1 ? (
          /* Single File Focused View (Showcase Card) */
          <div className="w-full flex items-center justify-center">
            <ConversionItemCard
              item={items[0]}
              onConvert={(id) => handleConvertItem(id, items[0].file)}
              onRemove={handleRemoveItem}
              onCompare={(item) => setComparingItem(item)}
              isProcessing={isProcessing}
              variant="hero"
              onAddMore={() => globalInputRef.current?.click()}
            />
          </div>
        ) : (
          /* Multi-File Queue View */
          <div className="w-full max-w-xl flex flex-col space-y-3 overflow-hidden">
            <BatchActionBar
              items={items}
              onConvertAll={handleConvertAll}
              onClearAll={handleClearAll}
              onClearCompleted={handleClearCompleted}
              isProcessing={isProcessing}
            />

            {/* Scrollable list */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 max-h-[calc(100vh-170px)] pr-1">
              {items.map((item) => (
                <ConversionItemCard
                  key={item.id}
                  item={item}
                  onConvert={(id) => handleConvertItem(id, item.file)}
                  onRemove={handleRemoveItem}
                  onCompare={(item) => setComparingItem(item)}
                  isProcessing={isProcessing}
                  variant="row"
                />
              ))}
            </div>

            {/* Compact Add File Bar */}
            <button
              onClick={() => globalInputRef.current?.click()}
              className="w-full py-2.5 rounded-xl border border-dashed border-neutral-800 hover:border-neutral-700 bg-neutral-950 hover:bg-neutral-900/50 text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add another file</span>
            </button>
          </div>
        )}
      </main>

      {/* Comparison Modal */}
      {comparingItem && comparingItem.result && (
        <ComparisonModal
          isOpen={true}
          onClose={() => setComparingItem(null)}
          originalFile={comparingItem.file}
          result={comparingItem.result}
        />
      )}

      {/* Professional subtle copyright footer */}
      <footer className="h-8 shrink-0 flex items-center justify-center text-[11px] text-neutral-600 tracking-wide select-none">
        <span>© {new Date().getFullYear()} makeurfun. All rights reserved.</span>
      </footer>
    </div>
  );
}
