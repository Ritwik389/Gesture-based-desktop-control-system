import { useEffect, useState } from "react";
import { useStore } from "@/lib/gestureStore";
import { Button } from "@/components/ui/button";
import { Camera, ChevronLeft, Save, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";

export default function Monitor() {
  const [, setLocation] = useLocation();
  const { image, status, progress, connect, sendAction } = useStore();
  const [target, setTarget] = useState<string>("rock");

  useEffect(() => {
    connect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
        <Button variant="ghost" onClick={() => setLocation('/mapping')} className="text-slate-400">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Mapping
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-tighter text-emerald-500">Neural Link Active</span>
        </div>
      </div>

      {/* Camera Feed Section */}
      <div className="flex-1 relative flex items-center justify-center p-6">
        <div className="relative w-full max-w-4xl aspect-video bg-black rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
          {image ? (
            <img src={`data:image/jpeg;base64,${image}`} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-600">
              <Camera className="h-12 w-12 mb-4 animate-pulse" />
              <p>Establishing secure handshake with Python engine...</p>
            </div>
          )}

          {/* Training Overlay */}
          {status === 'RECORDING' && (
            <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-6xl font-black text-white mb-2 italic">RECORDING</h2>
                <div className="text-2xl font-mono text-blue-300">Samples: {progress} / 50</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Training Controls */}
      <div className="p-8 bg-slate-900 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Step 1: Target Label</label>
          <div className="flex flex-wrap gap-2">
            {['rock', 'paper', 'nothing'].map(l => (
              <Button 
                key={l}
                variant={target === l ? "default" : "outline"}
                className={target === l ? "bg-blue-600" : "border-slate-700"}
                onClick={() => setTarget(l)}
              >
                {l}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <Button 
            size="lg"
            className="w-full bg-white text-black hover:bg-slate-200 font-bold py-6"
            onClick={() => sendAction('record', { label: target })}
          >
            Start Recording {target.toUpperCase()}
          </Button>
        </div>

        <div className="flex flex-col items-end justify-center space-y-2">
           <Button variant="outline" className="border-emerald-500/50 text-emerald-400" onClick={() => sendAction('train')}>
             <Save className="mr-2 h-4 w-4" /> Finalize Training
           </Button>
           <p className="text-[10px] text-slate-500 italic">This will rebuild the KNN model locally.</p>
        </div>
      </div>
    </div>
  );
}