import { useState, useEffect, useRef } from "react";
import { Terminal, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function DebugConsole() {
  const [logs, setLogs] = useState<{type: string, message: string, time: string}[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    const addLog = (type: string, args: any[]) => {
      const msg = args.map(a => {
        try {
          return typeof a === 'object' ? JSON.stringify(a) : String(a);
        } catch (e) {
          return String(a);
        }
      }).join(' ');
      const logEntry = { type, message: msg, time: new Date().toISOString().split('T')[1].slice(0, 8) };
      setLogs(prev => [...prev.slice(-299), logEntry]);
      
      // Send log to local Vite backend to be saved to a file
      if (import.meta.env.DEV) {
        fetch('/api/log', {
          method: 'POST',
          body: JSON.stringify(logEntry)
        }).catch(() => {});
      }
    };

    console.log = (...args) => {
      originalLog(...args);
      addLog('log', args);
    };
    
    console.warn = (...args) => {
      originalWarn(...args);
      addLog('warn', args);
    };
    
    console.error = (...args) => {
      originalError(...args);
      addLog('error', args);
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end pointer-events-none">
      {isOpen && (
        <div className="pointer-events-auto mb-2 w-[90vw] max-w-[450px] h-[50vh] bg-black/95 border border-white/20 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden backdrop-blur-xl">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-zinc-900/80">
            <div className="flex items-center gap-2 text-xs font-bold text-white/80 tracking-wider">
              <Terminal className="h-4 w-4 text-emerald-400" /> DEVICE LOGS ({logs.length})
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setLogs([])} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <Trash2 className="h-4 w-4 text-red-400" />
              </button>
              <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5 font-mono text-[11px] leading-relaxed select-text">
            {logs.map((l, i) => (
              <div key={i} className={cn("border-b border-white/5 pb-1.5 mb-1.5", 
                l.type === 'error' ? 'text-red-400' : 
                l.type === 'warn' ? 'text-yellow-400' : 'text-emerald-400'
              )}>
                <span className="text-white/30 mr-2">[{l.time}]</span>
                <span className="break-words">{l.message}</span>
              </div>
            ))}
            {logs.length === 0 && <div className="text-white/30 text-center mt-8 text-xs font-medium">Waiting for console events...</div>}
          </div>
        </div>
      )}
      
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto h-10 w-10 rounded-full bg-black/80 border border-white/15 flex items-center justify-center text-white/60 hover:text-white hover:bg-black hover:scale-110 active:scale-95 transition-all shadow-xl backdrop-blur-md"
          title="Open Debug Logs"
        >
          <Terminal className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
