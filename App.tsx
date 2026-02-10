import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Trash2,
  RefreshCcw,
  Settings,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface QueueItem {
  id: string;
  text: string;
  status: string;
}

function App() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [status, setStatus] = useState<string>('idle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['enchantedQueue', 'enchantedStatus'], (result) => {
        if (result.enchantedQueue) setQueue(result.enchantedQueue);
        if (result.enchantedStatus) setStatus(result.enchantedStatus);
        setLoading(false);
      });

      // Listen for changes
      const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
        if (changes.enchantedQueue) {
          setQueue(changes.enchantedQueue.newValue || []);
        }
        if (changes.enchantedStatus) {
          setStatus(changes.enchantedStatus.newValue || 'idle');
        }
      };

      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    } else {
      // Demo mode if not in extension
      setQueue([
        { id: '1', text: 'Explain quantum computing to a five year old', status: 'pending' },
        { id: '2', text: 'Write a short story about a time-traveling toaster', status: 'pending' },
      ]);
      setLoading(false);
    }
  }, []);

  const clearQueue = () => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ enchantedQueue: [] });
    } else {
      setQueue([]);
    }
  };

  const removeItem = (id: string) => {
    const newQueue = queue.filter(item => item.id !== id);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ enchantedQueue: newQueue });
    } else {
      setQueue(newQueue);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0c0d12] text-slate-200 overflow-hidden">
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between border-b border-white/5 bg-white/5 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.3)] animate-pulse">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-[15px] leading-tight tracking-tight text-white">
              Enchanted <span className="text-indigo-400 font-mono text-xs ml-1">v1.0</span>
            </h1>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${status === 'processing' ? 'bg-yellow-400 animate-pulse' : status === 'sending' ? 'bg-green-500 animate-bounce' : 'bg-slate-500'}`}></span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                {status === 'processing' ? 'AI Processing' : status === 'sending' ? 'Sending...' : 'Ready'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.open('https://aistudio.google.com', '_blank')}
            className="p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-all transform hover:scale-110"
            title="Ir para AI Studio"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">

        {/* Queue Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center transition-all hover:bg-white/10 hover:border-white/10">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">In Queue</span>
            <span className="text-2xl font-black text-white">{queue.length}</span>
          </div>
          <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col items-center justify-center transition-all hover:bg-white/10 hover:border-white/10">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Processed</span>
            <span className="text-2xl font-black text-indigo-400">0</span>
          </div>
        </div>

        {/* List Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Clock className="w-3 h-3" /> Commands List
          </h2>
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              className="text-[10px] text-red-400/70 hover:text-red-400 font-bold uppercase tracking-widest flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
          )}
        </div>

        {/* Queue List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <RefreshCcw className="w-6 h-6 text-slate-600 animate-spin" />
              <span className="text-sm text-slate-500">Loading magic...</span>
            </div>
          ) : queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center bg-white/[0.02] border border-dashed border-white/5 rounded-2xl group transition-all hover:border-indigo-500/20">
              <div className="w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6 text-slate-600" />
              </div>
              <p className="text-sm text-slate-400 font-medium">Queue is currently empty</p>
              <p className="text-[11px] text-slate-600 mt-2">
                Type messages in Google AI Studio and click the <span className="text-indigo-400">Send Icon</span> to add them here.
              </p>
            </div>
          ) : (
            queue.map((item, index) => (
              <div
                key={item.id}
                className="group relative bg-[#15171e] border border-white/5 rounded-xl p-3 hover:border-indigo-500/30 transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[10px] font-bold text-indigo-400">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed font-medium">
                      {item.text}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {index === 0 && status !== 'idle' && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1 h-1 rounded-full bg-indigo-500 animate-[bounce_1s_infinite_100ms]"></span>
                      <span className="w-1 h-1 rounded-full bg-indigo-500 animate-[bounce_1s_infinite_300ms]"></span>
                      <span className="w-1 h-1 rounded-full bg-indigo-500 animate-[bounce_1s_infinite_500ms]"></span>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">Active Task</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-white/5 bg-[#0c0d12]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-slate-500">
            <div className="flex items-center gap-1.5 group cursor-help" title="Conectado com AI Studio">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[10px] font-bold group-hover:text-slate-300 transition-colors">SYNCED</span>
            </div>
            <div className="flex items-center gap-1.5 group cursor-help" title="Modo Automático Ativado">
              <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-[10px] font-bold group-hover:text-slate-300 transition-colors">AUTO-MODE</span>
            </div>
          </div>
          <p className="text-[9px] text-slate-600 font-mono">ENCHANTED CORE v1.0.4</p>
        </div>
      </footer>
    </div>
  );
}

export default App;