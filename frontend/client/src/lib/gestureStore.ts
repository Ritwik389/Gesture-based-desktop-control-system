import { create } from "zustand";

const WS_URL = "ws://127.0.0.1:8000/ws/video";
const API_BASE_URL = "http://127.0.0.1:8000/api";

export type GestureType = string;
export type DesktopAction =
  | "MUTE"
  | "PLAY_PAUSE"
  | "PREVIOUS_SLIDE"
  | "NEXT_SLIDE"
  | "VOLUME_UP"
  | "VOLUME_DOWN"
  | "NONE"
  | "ZOOM_IN"
  | "ZOOM_OUT"
  | "LOCK_SCREEN";
export type SystemStatus = "ONLINE" | "OFFLINE";

export interface Mapping {
  id: string;
  gesture: GestureType;
  action: DesktopAction;
}

export interface ModelStatusPayload {
  is_trained: boolean;
  classes: string[];
  training_samples: number;
  validation_accuracy: number | null;
  last_trained_at: number | null;
  default_threshold: number;
  required_consecutive_frames: number;
  gesture_thresholds: Record<string, number>;
  mappings: Record<string, string>;
  monitoring_active: boolean;
}

interface GestureState {
  isAuthenticated: boolean;
  isMonitoring: boolean;
  userEmail: string | null;
  image: string | null;
  status: string;
  gesture: string;
  confidence: number; // 0..1
  progress: number;
  logs: Array<{ id: string; type: "INFO" | "SUCCESS" | "ERROR"; message: string; timestamp: number }>;
  mappings: Mapping[];
  mlStatus: SystemStatus;
  backendStatus: SystemStatus;
  wsStatus: SystemStatus;
  connect: () => void;
  login: (email: string) => void;
  logout: () => void;
  toggleMonitoring: () => Promise<void>;
  updateMapping: (id: string, field: "gesture" | "action", value: string) => void;
  setMappings: (mappings: Mapping[]) => void;
  sendAction: (endpoint: string, data?: unknown) => Promise<Response>;
  addMapping: () => void;
  removeMapping: (id: string) => void;
}

let socket: WebSocket | null = null;

function addLog(
  set: (partial: Partial<GestureState> | ((state: GestureState) => Partial<GestureState>)) => void,
  type: "INFO" | "SUCCESS" | "ERROR",
  message: string,
) {
  set((state) => ({
    logs: [
      ...state.logs.slice(-99),
      { id: crypto.randomUUID(), type, message, timestamp: Date.now() },
    ],
  }));
}

export const useStore = create<GestureState>((set, get) => ({
  isAuthenticated: true,
  isMonitoring: false,
  userEmail: null,
  image: null,
  status: "IDLE",
  gesture: "NONE",
  confidence: 0,
  progress: 0,
  logs: [],
  mlStatus: "OFFLINE",
  backendStatus: "OFFLINE",
  wsStatus: "OFFLINE",
  mappings: [
    { id: "1", gesture: "ROCK", action: "VOLUME_UP" },
    { id: "2", gesture: "PAPER", action: "NEXT_SLIDE" },
  ],

  connect: () => {
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      set({ wsStatus: "ONLINE", backendStatus: "ONLINE", mlStatus: "ONLINE" });
      addLog(set, "SUCCESS", "WebSocket connected");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const normalizedGesture = String(data.gesture ?? "none").toUpperCase();
      const normalizedConfidence = Number(data.confidence ?? 0);
      const normalizedProgress = Number(data.progress ?? 0);
      const normalizedStatus = String(data.status ?? "IDLE");

      set({
        image: data.image ?? null,
        status: normalizedStatus,
        gesture: normalizedGesture,
        confidence: Number.isFinite(normalizedConfidence) ? normalizedConfidence : 0,
        progress: Number.isFinite(normalizedProgress) ? normalizedProgress : 0,
        mlStatus: "ONLINE",
      });
    };

    socket.onerror = () => {
      set({ wsStatus: "OFFLINE", backendStatus: "OFFLINE", mlStatus: "OFFLINE" });
      addLog(set, "ERROR", "WebSocket error");
    };

    socket.onclose = () => {
      set({ wsStatus: "OFFLINE", backendStatus: "OFFLINE", mlStatus: "OFFLINE", isMonitoring: false });
      addLog(set, "INFO", "WebSocket disconnected");
      socket = null;
    };
  },

  login: (email) => {
    set({ isAuthenticated: true, userEmail: email });
  },

  logout: () => {
    set({ isAuthenticated: false, isMonitoring: false });
    void get().sendAction("toggle_control", { active: false });
  },

  toggleMonitoring: async () => {
    const active = !get().isMonitoring;
    const response = await get().sendAction("toggle_control", { active });
    if (!response.ok) {
      addLog(set, "ERROR", "Failed to toggle monitoring");
      return;
    }

    const payload = await response.json();
    const isActive = Boolean(payload.active);
    set({ isMonitoring: isActive });
    addLog(set, "INFO", `Monitoring ${isActive ? "enabled" : "disabled"}`);
  },

  updateMapping: (id, field, value) =>
    set((state) => ({
      mappings: state.mappings.map((m) =>
        m.id === id ? ({ ...m, [field]: value } as Mapping) : m,
      ),
    })),

  setMappings: (mappings) => set({ mappings }),

  addMapping: () =>
    set((state) => ({
      mappings: [...state.mappings, { id: crypto.randomUUID(), gesture: "CUSTOM_GESTURE", action: "NONE" }],
    })),

  removeMapping: (id) =>
    set((state) => ({
      mappings: state.mappings.filter((m) => m.id !== id),
    })),

  sendAction: async (endpoint, data = {}) => {
    return fetch(`${API_BASE_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
}));
