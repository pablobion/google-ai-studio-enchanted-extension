import React from 'react';
import { QueueItem } from '../types';
import { Layers, X, GripVertical, PlayCircle } from 'lucide-react';

interface QueuePanelProps {
  queue: QueueItem[];
  removeFromQueue: (id: string) => void;
  isProcessing: boolean;
  clearQueue: () => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({ 
  queue, 
  removeFromQueue, 
  isProcessing,
  clearQueue
}) => {
  if (queue.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 md:right-8 md:bottom-28 w-[calc(100%-2rem)] md:w-80 bg-enchanted-surface/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl z-40 overflow-hidden transform transition-all duration-300 animate-in fade-in slide-in-from-bottom-4">
      <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-enchanted-accent font-medium">
          <Layers className="w-4 h-4" />
          <span>Queue ({queue.length})</span>
        </div>
        
        <div className="flex items-center gap-2">
            {isProcessing && (
                <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-enchanted-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-enchanted-accent"></span>
                </span>
            )}
            <button 
            onClick={clearQueue}
            className="text-xs text-gray-400 hover:text-white transition-colors"
            >
            Clear
            </button>
        </div>
      </div>

      <div className="max-h-60 overflow-y-auto p-2 space-y-2">
        {queue.map((item, index) => (
          <div 
            key={item.id}
            className="group relative flex items-start gap-3 p-3 bg-black/20 rounded-xl border border-white/5 hover:border-enchanted-accent/30 transition-all"
          >
            <div className="mt-1 text-gray-500">
                <span className="text-[10px] font-mono opacity-50">#{index + 1}</span>
            </div>
            
            <p className="text-sm text-gray-300 line-clamp-2 flex-1 break-words">
              {item.text}
            </p>

            <button
              onClick={() => removeFromQueue(item.id)}
              className="absolute top-2 right-2 p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-enchanted-surface rounded-md"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      
      <div className="p-2 bg-enchanted-accent/10 border-t border-enchanted-accent/20 text-center">
        <p className="text-[10px] text-enchanted-accent font-medium uppercase tracking-wider flex items-center justify-center gap-2">
            {isProcessing ? 'Auto-playing Queue...' : 'Waiting for idle...'}
        </p>
      </div>
    </div>
  );
};