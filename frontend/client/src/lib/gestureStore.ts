import { create } from "zustand";

const WS_URL = "ws://127.0.0.1:8000/ws/video";
const API_BASE_URL = "http://127.0.0.1:8000/api";

export type DesktopAction =
  | "MUTE"
  | "PLAY_PAUSE"
  | "PREVIOUS_SLIDE"
  | "NEXT_SLIDE"
  | "VOLUME_UP"
  | "VOLUME_DOWN"
  | "ZOOM_IN"
  | "ZOOM_OUT"
  | "LOCK_SCREEN";

export interface GestureConfig {
  id: string;
  label: string;
  action: DesktopAction;
  emoji: string;
  threshold: number;
}

export interface ModelStatusPayload {
  is_trained: boolean;
  classes: string[];
  training_samples: number;
  validation_accuracy: number | null;
  last_trained_at: number | null;
  default_threshold: number;
  required_consecutive_frames: number;
  monitoring_active: boolean;
  gestures_count: number;
  recording_active?: boolean;
  recording_label?: string;
  recording_action?: string;
  recording_target?: number;
  recording_count?: number;
  recording_message?: string;
}

interface StoreState {
  wsStatus: "ONLINE" | "OFFLINE";
  backendStatus: "ONLINE" | "OFFLINE";
  image: string | null;
  status: string;
  gesture: string;
  gestureEmoji: string;
  confidence: number;
  handDetected: boolean;
  recordingActive: boolean;
  recordingLabel: string;
  recordingAction: string;
  recordingTarget: number;
  recordingCount: number;
  recordingMessage: string;
  logs: Array<{ id: string; type: "INFO" | "SUCCESS" | "ERROR"; message: string; timestamp: number }>;
  gestures: GestureConfig[];
  supportedActions: DesktopAction[];
  modelStatus: ModelStatusPayload | null;
  connect: () => void;
  sendAction: (endpoint: string, data?: unknown) => Promise<Response>;
  loadGestures: () => Promise<void>;
  saveGestures: (gestures: GestureConfig[]) => Promise<boolean>;
  loadModelStatus: () => Promise<void>;
  toggleMonitoring: (active: boolean) => Promise<boolean>;
}

let socket: WebSocket | null = null;

function log(set: any, type: "INFO" | "SUCCESS" | "ERROR", message: string) {
  set((state: StoreState) => ({
    logs: [...state.logs.slice(-149), { id: crypto.randomUUID(), type, message, timestamp: Date.now() }],
  }));
}

export const useStore = create<StoreState>((set, get) => ({
  wsStatus: "OFFLINE",
  backendStatus: "OFFLINE",
  image: null,
  status: "IDLE",
  gesture: "none",
  gestureEmoji: "",
  confidence: 0,
  handDetected: false,
  recordingActive: false,
  recordingLabel: "",
  recordingAction: "",
  recordingTarget: 0,
  recordingCount: 0,
  recordingMessage: "",
  logs: [],
  gestures: [],
  supportedActions: [],
  modelStatus: null,

  connect: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      set({ wsStatus: "ONLINE", backendStatus: "ONLINE" });
      log(set, "SUCCESS", "JARVIS video stream connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      set({
        image: data.image ?? null,
        status: String(data.status ?? "IDLE"),
        gesture: String(data.gesture ?? "none").toUpperCase(),
        gestureEmoji: String(data.emoji ?? ""),
        confidence: Number(data.confidence ?? 0),
        handDetected: Boolean(data.hand_detected),
        recordingActive: Boolean(data.recording_active),
        recordingLabel: String(data.recording_label ?? ""),
        recordingAction: String(data.recording_action ?? ""),
        recordingTarget: Number(data.recording_target ?? 0),
        recordingCount: Number(data.recording_count ?? 0),
        recordingMessage: String(data.recording_message ?? ""),
      });
    };

    socket.onerror = () => {
      set({ wsStatus: "OFFLINE", backendStatus: "OFFLINE" });
      log(set, "ERROR", "JARVIS video stream error");
    };

    socket.onclose = () => {
      set({ wsStatus: "OFFLINE" });
      log(set, "INFO", "JARVIS video stream disconnected");
      socket = null;
    };
  },

  sendAction: async (endpoint, data = {}) => {
    return fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },

  loadGestures: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/gestures`);
      if (!response.ok) {
        log(set, "ERROR", "Failed to load gesture registry");
        return;
      }
      const payload = await response.json();
      set({
        gestures: (payload.gestures ?? []) as GestureConfig[],
        supportedActions: (payload.supported_actions ?? []) as DesktopAction[],
      });
    } catch {
      log(set, "ERROR", "Gesture registry unavailable");
    }
  },

  saveGestures: async (gestures) => {
    try {
      const response = await get().sendAction("gestures", { gestures });
      if (!response.ok) {
        log(set, "ERROR", "Failed to save gesture registry");
        return false;
      }
      const payload = await response.json();
      set({ gestures: payload.gestures ?? gestures });
      log(set, "SUCCESS", "Gesture registry updated");
      if (payload?.pruned_samples > 0) {
        log(set, "INFO", `Removed ${payload.pruned_samples} stale training samples`);
      }
      if (payload?.relabeled_samples > 0) {
        log(set, "INFO", `Relabeled ${payload.relabeled_samples} training samples after registry rename`);
      }
      if (payload?.auto_retrained) {
        log(set, "SUCCESS", payload.retrain_message ?? "Model auto-retrained after gesture removal");
      } else if (payload?.retrain_message && payload.retrain_message !== "No retraining needed.") {
        log(set, "INFO", payload.retrain_message);
      }
      return true;
    } catch {
      log(set, "ERROR", "Gesture registry save failed");
      return false;
    }
  },

  loadModelStatus: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/model_status`);
      if (!response.ok) {
        log(set, "ERROR", "Model status unavailable");
        return;
      }
      const payload = (await response.json()) as ModelStatusPayload;
      set({
        modelStatus: payload,
        recordingActive: Boolean(payload.recording_active),
        recordingLabel: String(payload.recording_label ?? ""),
        recordingAction: String(payload.recording_action ?? ""),
        recordingTarget: Number(payload.recording_target ?? 0),
        recordingCount: Number(payload.recording_count ?? 0),
        recordingMessage: String(payload.recording_message ?? ""),
      });
    } catch {
      log(set, "ERROR", "Model status unavailable");
    }
  },

  toggleMonitoring: async (active) => {
    try {
      const response = await get().sendAction("toggle_control", { active });
      if (!response.ok) {
        log(set, "ERROR", "Failed to change monitoring state");
        return false;
      }
      const payload = await response.json();
      if (payload?.success === false || payload?.status === "error") {
        log(set, "ERROR", payload.message ?? "Monitoring could not be enabled");
        return false;
      }
      log(set, "INFO", `Monitoring ${payload.active ? "enabled" : "disabled"}`);
      await get().loadModelStatus();
      return true;
    } catch {
      log(set, "ERROR", "Monitoring control failed");
      return false;
    }
  },
}));
