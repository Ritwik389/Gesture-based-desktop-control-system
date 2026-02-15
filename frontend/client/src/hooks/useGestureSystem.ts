import { useState, useEffect, useRef } from 'react';

const WS_URL = "ws://127.0.0.1:8000/ws/video";

export function useGestureSystem() {
  const [image, setImage] = useState<string | null>(null);
  const [status, setStatus] = useState("disconnected"); // disconnected, idle, recording, predicting
  const [gesture, setGesture] = useState("None");
  const [confidence, setConfidence] = useState(0.0);
  const [progress, setProgress] = useState(0); // For the recording bar
  
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    // 1. Connect to Python Backend
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => setStatus("idle");
    ws.current.onclose = () => setStatus("disconnected");
    
    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update State from Python Data
      setImage(data.image);
      setStatus(data.status); // "IDLE", "RECORDING", "PREDICTING"
      setGesture(data.gesture);
      setConfidence(data.confidence);
      if (data.progress) setProgress(data.progress);
    };

    return () => {
      ws.current?.close();
    };
  }, []);

  // 2. Helper Functions to Control Python
  const startRecording = async (label: string) => {
    await fetch("http://127.0.0.1:8000/api/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label }),
    });
  };

  const trainModel = async () => {
    setStatus("training");
    await fetch("http://127.0.0.1:8000/api/train", { method: "POST" });
  };

  return {
    image,
    status,
    gesture,
    confidence,
    progress,
    startRecording,
    trainModel
  };
}