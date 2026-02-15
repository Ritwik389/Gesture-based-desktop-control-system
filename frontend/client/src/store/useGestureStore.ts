import { create } from 'zustand';

interface GestureState {
  image: string | null;
  status: string;
  gesture: string;
  confidence: number;
  progress: number;
  connect: () => void;
  sendAction: (action: string, data?: any) => Promise<void>;
}

export const useGestureStore = create<GestureState>((set, get) => ({
  image: null,
  status: 'IDLE',
  gesture: 'None',
  confidence: 0,
  progress: 0,

  connect: () => {
    const socket = new WebSocket('ws://127.0.0.1:8000/ws/video');
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      set({ 
        image: data.image, 
        status: data.status, 
        gesture: data.gesture, 
        confidence: data.confidence,
        progress: data.progress 
      });
    };
  },

  sendAction: async (endpoint, data = {}) => {
    await fetch(`http://127.0.0.1:8000/api/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  }
}));