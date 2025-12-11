import React, { useState } from 'react';
import { Layers, Download, Copy, Sparkles, Terminal, FileCode, CheckCircle } from 'lucide-react';

// This is a documentation/installer page since we cannot run a Chrome Extension inside a web container.
// The user will copy the files generated in the file system to use the extension.

function App() {
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-200 font-sans selection:bg-enchanted-accent selection:text-white">
      
      {/* Hero Section */}
      <header className="border-b border-white/5 bg-[#0f1117]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-enchanted-accent to-purple-600 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.3)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">
              AI Studio <span className="text-enchanted-accent font-mono ml-1">ENCHANTED</span> <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full text-gray-400 font-normal ml-2">Extension</span>
            </h1>
          </div>
          <a 
            href="https://aistudio.google.com/" 
            target="_blank" 
            rel="noreferrer"
            className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
          >
            Go to AI Studio <Terminal className="w-3 h-3" />
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Intro */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-500 mb-6">
            Automate your Prompt Queue
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            This extension injects a modern panel into Google AI Studio, allowing you to queue multiple messages.
            The script detects when the AI finishes responding and automatically sends the next prompt.
          </p>
        </div>

        {/* Demo Preview Mockup */}
        <div className="relative rounded-xl border border-white/10 bg-[#1e212b] p-4 mb-16 shadow-2xl overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
            <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/20"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                <span className="text-xs text-gray-500 ml-2">aistudio.google.com (Mockup)</span>
            </div>
            
            <div className="flex gap-4 h-[300px]">
                <div className="flex-1 bg-black/20 rounded-lg p-4 space-y-4">
                    <div className="bg-gray-800 w-3/4 h-20 rounded-lg rounded-tl-none animate-pulse"></div>
                    <div className="bg-enchanted-accent/20 w-1/2 h-12 rounded-lg rounded-tr-none ml-auto"></div>
                </div>
                
                {/* The Extension UI Mockup */}
                <div className="w-72 bg-[#0f1117]/95 border border-purple-500/30 rounded-xl shadow-lg flex flex-col p-0 overflow-hidden transform group-hover:-translate-y-1 transition-transform duration-500">
                    <div className="p-3 bg-purple-900/10 border-b border-white/5 flex justify-between items-center">
                        <span className="text-purple-400 font-semibold text-xs flex gap-1 items-center">✨ Queue <span>(2)</span></span>
                    </div>
                    <div className="p-3 flex flex-col gap-2 flex-1">
                        <div className="bg-white/5 p-2 rounded text-[10px] text-gray-300 border-l-2 border-purple-500">
                            Explain the theory of relativity...
                        </div>
                        <div className="bg-white/5 p-2 rounded text-[10px] text-gray-300 border-l-2 border-gray-600">
                            Write a poem about coffee...
                        </div>
                        <div className="mt-auto pt-2 border-t border-white/5 text-center">
                            <span className="text-[9px] text-purple-400 font-bold uppercase tracking-widest animate-pulse">🚀 Sending...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Installation Steps */}
        <div className="space-y-12">
            <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">Download Files</h3>
                    <p className="text-gray-400 mb-4">
                        The files <code>manifest.json</code>, <code>content.js</code>, and <code>styles.css</code> have already been created in your file directory.
                    </p>
                </div>
            </div>

            <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">Install on Chrome</h3>
                    <ul className="space-y-3 text-gray-400 list-disc pl-4">
                        <li>Open <code>chrome://extensions</code> in your browser.</li>
                        <li>Enable <strong>Developer Mode</strong> (top right corner).</li>
                        <li>Click <strong>Load unpacked</strong>.</li>
                        <li>Select the folder where these files are saved.</li>
                    </ul>
                </div>
            </div>

            <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">Use in AI Studio</h3>
                    <p className="text-gray-400">
                        Go to <a href="https://aistudio.google.com" className="text-enchanted-accent hover:underline">aistudio.google.com</a>. You will see the panel in the bottom right corner.
                    </p>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}

export default App;