import { create } from 'zustand';

// types...
export type GestureType = 'ROCK' | 'PAPER' | 'NOTHING' | 'SWIPE_LEFT' | 'SWIPE_RIGHT';
export type DesktopAction = 'MUTE' | 'PLAY_PAUSE' | 'PREVIOUS_SLIDE' | 'NEXT_SLIDE' | 'VOLUME_UP' | 'VOLUME_DOWN' | 'NONE' | 'ZOOM_IN' | 'ZOOM_OUT' | 'LOCK_SCREEN';

interface Mapping { id: string; gesture: GestureType; action: DesktopAction; }

interface GestureState {
  isAuthenticated: boolean;
  isMonitoring: boolean;
  image: string | null;
  status: string;
  gesture: string;
  confidence: number;
  progress: number;
  logs: any[];
  mappings: Mapping[];
  chartBuffer: { time: number; confidence: number }[]; // Persistent graph data
  connect: () => void;
  toggleMonitoring: () => void;
  updateMapping: (id: string, field: string, value: any) => void;
  sendAction: (endpoint: string, data?: any) => Promise<void>;
  addMapping: () => void;
  removeMapping: (id: string) => void;
}

export const useStore = create<GestureState>((set, get) => ({
  isAuthenticated: true,
  isMonitoring: false,
  image: null,
  status: 'IDLE',
  gesture: 'None',
  confidence: 0,
  progress: 0,
  logs: [],
  mappings: [
    { id: '1', gesture: 'ROCK', action: 'VOLUME_UP' },
    { id: '2', gesture: 'PAPER', action: 'NEXT_SLIDE' }
  ],
  // Pre-fill with 20 empty points
  chartBuffer: Array.from({ length: 20 }, (_, i) => ({ time: i, confidence: 0 })),

  connect: () => {
    const socket = new WebSocket('ws://127.0.0.1:8000/ws/video');
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const currentBuffer = get().chartBuffer;
      
      // Update state and push new point to buffer
      set({ 
        image: data.image,
        status: data.status,
        gesture: data.gesture,
        confidence: data.confidence,
        progress: data.progress,
        chartBuffer: [
          ...currentBuffer.slice(1), 
          { time: currentBuffer[currentBuffer.length - 1].time + 1, confidence: data.confidence }
        ]
      });
    };
  },

  toggleMonitoring: async () => {
    const active = !get().isMonitoring;
    await get().sendAction('toggle_control', { active });
    set({ isMonitoring: active });
  },

  updateMapping: (id, field, value) => set(state => ({
    mappings: state.mappings.map(m => m.id === id ? { ...m, [field]: value } : m)
  })),

  addMapping: () => set(state => ({
    mappings: [...state.mappings, { id: crypto.randomUUID(), gesture: 'NOTHING', action: 'NONE' }]
  })),

  removeMapping: (id) => set(state => ({
    mappings: state.mappings.filter(m => m.id !== id)
  })),

  sendAction: async (endpoint, data = {}) => {
    return await fetch(`http://127.0.0.1:8000/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }
}));