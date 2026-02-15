import { useState } from "react";
import { useStore, DesktopAction } from "@/lib/gestureStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, ChevronLeft, Save } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const ACTION_OPTIONS: DesktopAction[] = [
  "VOLUME_UP",
  "VOLUME_DOWN",
  "MUTE",
  "PLAY_PAUSE",
  "NEXT_SLIDE",
  "PREVIOUS_SLIDE",
  "ZOOM_IN",
  "ZOOM_OUT",
  "LOCK_SCREEN",
];

const ACTION_LABEL: Record<DesktopAction, string> = {
  VOLUME_UP: "Volume Up",
  VOLUME_DOWN: "Volume Down",
  MUTE: "Mute",
  PLAY_PAUSE: "Play / Pause",
  NEXT_SLIDE: "Next Slide",
  PREVIOUS_SLIDE: "Previous Slide",
  ZOOM_IN: "Zoom In",
  ZOOM_OUT: "Zoom Out",
  LOCK_SCREEN: "Lock Screen",
  NONE: "None",
};

export default function Monitor() {
  const [, setLocation] = useLocation();
  const { image, status, progress, sendAction } = useStore();
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<DesktopAction>("MUTE");
  const [gestureLabel, setGestureLabel] = useState<string>("MY_MUTE_GESTURE");
  const [defaultThreshold, setDefaultThreshold] = useState(0.85);
  const [requiredStreak, setRequiredStreak] = useState(3);

  const startRecording = async () => {
    const label = gestureLabel.trim().toLowerCase();
    if (!label) {
      toast({ variant: "destructive", title: "Missing gesture label", description: "Enter a label before recording." });
      return;
    }

    await sendAction("record", { label });
    toast({
      title: `Recording ${gestureLabel.toUpperCase()}`,
      description: `Action target: ${ACTION_LABEL[selectedAction]}`,
    });
  };

  const finalizeTraining = async () => {
    const label = gestureLabel.trim().toLowerCase();
    if (!label) {
      toast({ variant: "destructive", title: "Missing gesture label", description: "Enter a label before training." });
      return;
    }

    const trainResp = await sendAction("train");
    if (!trainResp.ok) {
      toast({ variant: "destructive", title: "Training failed", description: "Could not rebuild model." });
      return;
    }

    const bindResp = await sendAction("bind_action_gesture", {
      action: selectedAction,
      gesture: label,
    });
    if (!bindResp.ok) {
      toast({ variant: "destructive", title: "Mapping update failed", description: "Training succeeded but action binding failed." });
      return;
    }

    toast({
      title: "Training complete",
      description: `${gestureLabel.toUpperCase()} is now bound to ${ACTION_LABEL[selectedAction]} (old mapping replaced).`,
    });
  };

  const applyPredictionTuning = async () => {
    await sendAction("update_prediction_config", {
      default_threshold: defaultThreshold,
      required_consecutive_frames: requiredStreak,
    });
    toast({ title: "Prediction tuning saved", description: "Threshold and smoothing updated." });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
        <Button variant="ghost" onClick={() => setLocation("/mapping")} className="text-slate-400">
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Mapping
        </Button>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-tighter text-emerald-500">Neural Link Active</span>
        </div>
      </div>

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

          {status === "RECORDING" && (
            <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-6xl font-black text-white mb-2 italic">RECORDING</h2>
                <div className="text-2xl font-mono text-blue-300">Samples: {progress} / 50</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-8 border-t border-white/10 bg-slate-950">
        <div className="max-w-6xl mx-auto space-y-6">
          <h3 className="text-xl font-bold">Action-First Training</h3>
          <p className="text-sm text-slate-400">
            Pick an action, record a custom gesture, then finalize. Each action can have only one gesture.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
            <label className="text-xs text-slate-300">
              Target Action
              <Select value={selectedAction} onValueChange={(v) => setSelectedAction(v as DesktopAction)}>
                <SelectTrigger className="mt-1 bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_OPTIONS.map((action) => (
                    <SelectItem key={action} value={action}>
                      {ACTION_LABEL[action]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="text-xs text-slate-300">
              Gesture Label
              <Input
                className="mt-1 bg-slate-800 border-slate-700 uppercase"
                value={gestureLabel}
                onChange={(e) => setGestureLabel(e.target.value.toUpperCase())}
                placeholder="LEFT_SPLIT"
              />
            </label>
            <div className="flex items-end">
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={startRecording}>
                Start Recording
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="border-emerald-500/50 text-emerald-300" onClick={finalizeTraining}>
              <Save className="mr-2 h-4 w-4" /> Finalize Training
            </Button>
            <Button
              variant="outline"
              className="border-cyan-500/50 text-cyan-300"
              onClick={() => setLocation("/mapping")}
            >
              Go to Action Mapping
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-white/10 bg-white/5">
            <label className="text-xs text-slate-300">
              Default Threshold
              <input
                className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                type="number"
                min={0.55}
                max={0.98}
                step={0.01}
                value={defaultThreshold}
                onChange={(e) => setDefaultThreshold(Number(e.target.value))}
              />
            </label>
            <label className="text-xs text-slate-300">
              Required Consecutive Frames
              <input
                className="mt-1 w-full rounded-md bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                type="number"
                min={1}
                max={10}
                step={1}
                value={requiredStreak}
                onChange={(e) => setRequiredStreak(Number(e.target.value))}
              />
            </label>
            <div className="flex items-end">
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700" onClick={applyPredictionTuning}>
                Apply Tuning
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
