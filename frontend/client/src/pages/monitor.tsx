import { useEffect, useRef, useState } from "react";
import { useStore, type DesktopAction } from "@/lib/gestureStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function LiveFeedPage() {
  const store = useStore();
  const { toast } = useToast();
  const [selectedAction, setSelectedAction] = useState<DesktopAction | "">("");
  const [label, setLabel] = useState("my_new_gesture");
  const [emoji, setEmoji] = useState("🙂");
  const [targetSamples, setTargetSamples] = useState(50);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const wasRecordingRef = useRef(false);

  useEffect(() => {
    void store.loadGestures();
  }, []);

  useEffect(() => {
    if (!selectedAction && store.supportedActions.length > 0) {
      setSelectedAction(store.supportedActions[0]);
    }
  }, [store.supportedActions, selectedAction]);

  useEffect(() => {
    if (wasRecordingRef.current && !store.recordingActive && store.recordingMessage) {
      toast({
        title: "Recording complete",
        description: store.recordingMessage,
      });
      void store.loadGestures();
      void store.loadModelStatus();
      setIsSubmitting(false);
    }
    wasRecordingRef.current = store.recordingActive;
  }, [store.recordingActive, store.recordingMessage, toast]);

  const startRecording = async () => {
    if (!selectedAction) return;
    setIsSubmitting(true);
    try {
      const response = await store.sendAction("start_recording_gesture", {
        action: selectedAction,
        label,
        emoji,
        target_samples: targetSamples,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        toast({
          variant: "destructive",
          title: "Training sample rejected",
          description: payload.message ?? "Could not start recording.",
        });
        setIsSubmitting(false);
        return;
      }
      toast({
        title: "Recording started",
        description: payload.message ?? "Keep your hand visible and vary orientation.",
      });
      wasRecordingRef.current = true;
    } finally {
      if (!store.recordingActive) {
        setIsSubmitting(false);
      }
    }
  };

  const retrain = async () => {
    await store.sendAction("train", {});
    await store.loadModelStatus();
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="border-cyan-400/20 bg-slate-950/55 shadow-[0_0_36px_rgba(14,116,144,0.25)]">
        <CardHeader>
          <CardTitle className="text-cyan-100">Live Camera Feed</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video overflow-hidden rounded-xl border border-cyan-400/25 bg-slate-950/70">
            {store.image ? (
              <img src={`data:image/jpeg;base64,${store.image}`} className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full place-items-center text-sm text-slate-400">Waiting for JARVIS stream...</div>
            )}
          </div>
          <div className="mt-4 rounded-lg border border-cyan-400/20 bg-slate-900/40 p-3 text-sm text-slate-300">
            Hand detected: <span className="font-semibold text-cyan-200">{store.handDetected ? "Yes" : "No"}</span>
            <br />
            Recording progress:{" "}
            <span className="font-semibold text-cyan-200">
              {store.recordingCount}/{store.recordingTarget || targetSamples}
            </span>
            {store.recordingMessage ? (
              <>
                <br />
                <span className="text-xs text-slate-400">{store.recordingMessage}</span>
              </>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-cyan-400/20 bg-slate-950/55 shadow-[0_0_36px_rgba(8,47,73,0.3)]">
        <CardHeader>
          <CardTitle className="text-cyan-100">Train New Gesture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block text-sm text-slate-300">Target Action</label>
          <Select value={selectedAction} onValueChange={(v) => setSelectedAction(v as DesktopAction)}>
            <SelectTrigger className="bg-slate-900/50">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {store.supportedActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="block text-sm text-slate-300">Gesture Label</label>
          <Input value={label} onChange={(e) => setLabel(e.target.value.toLowerCase())} className="bg-slate-900/50" />

          <label className="block text-sm text-slate-300">Emoji</label>
          <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-24 bg-slate-900/50 text-center" />

          <label className="block text-sm text-slate-300">Target Samples</label>
          <Input
            type="number"
            min={20}
            max={120}
            value={targetSamples}
            onChange={(e) => setTargetSamples(Math.max(20, Math.min(120, Number(e.target.value || 50))))}
            className="w-28 bg-slate-900/50"
          />

          <div className="flex gap-2">
            <Button
              className="bg-cyan-600 hover:bg-cyan-500"
              onClick={() => void startRecording()}
              disabled={isSubmitting || store.recordingActive}
            >
              {store.recordingActive ? `Recording ${store.recordingCount}/${store.recordingTarget}` : "Record Gesture Samples"}
            </Button>
            <Button variant="outline" className="border-cyan-400/40 bg-slate-900/40" onClick={() => void retrain()}>
              Retrain All Gestures
            </Button>
          </div>

          <p className="text-xs text-slate-400">
            JARVIS records real-time frame samples (no one-shot augmentation) and retrains automatically after sample collection completes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
