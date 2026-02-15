import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type GestureType = 'SWIPE_LEFT' | 'SWIPE_RIGHT' | 'SWIPE_UP' | 'SWIPE_DOWN' | 'PINCH' | 'SPREAD' | 'ROTATE' | 'NONE';
export type DesktopAction = 'PREVIOUS_SLIDE' | 'NEXT_SLIDE' | 'VOLUME_UP' | 'VOLUME_DOWN' | 'ZOOM_IN' | 'ZOOM_OUT' | 'MUTE' | 'LOCK_SCREEN' | 'NONE';
export type SystemStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'CONNECTING';

export interface GestureMapping {
  gesture: GestureType;
  action: DesktopAction;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
}

interface AppState {
  isAuthenticated: boolean;
  user: { name: string; email: string } | null;
  login: (email: string) => void;
  logout: () => void;

  lastGesture: GestureType;
  confidence: number;
  activeApp: string;
  
  mappings: GestureMapping[];
  updateMapping: (gesture: GestureType, action: DesktopAction) => void;

  wsStatus: SystemStatus;
  mlStatus: SystemStatus;
  backendStatus: SystemStatus;
  
  logs: LogEntry[];
  addLog: (type: LogEntry['type'], message: string) => void;

  setGesture: (gesture: GestureType, confidence: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      login: (email) => set({ isAuthenticated: true, user: { name: 'Power User', email } }),
      logout: () => set({ isAuthenticated: false, user: null }),

      lastGesture: 'NONE',
      confidence: 0,
      activeApp: 'Presentation Pro',

      mappings: [
        { gesture: 'SWIPE_LEFT', action: 'PREVIOUS_SLIDE' },
        { gesture: 'SWIPE_RIGHT', action: 'NEXT_SLIDE' },
        { gesture: 'SWIPE_UP', action: 'VOLUME_UP' },
        { gesture: 'SWIPE_DOWN', action: 'VOLUME_DOWN' },
        { gesture: 'PINCH', action: 'ZOOM_OUT' },
        { gesture: 'SPREAD', action: 'ZOOM_IN' },
      ],

      updateMapping: (gesture, action) => 
        set((state) => ({
          mappings: state.mappings.map(m => m.gesture === gesture ? { ...m, action } : m)
        })),

      wsStatus: 'ONLINE',
      mlStatus: 'ONLINE',
      backendStatus: 'ONLINE',

      logs: [
        { id: '1', timestamp: new Date().toISOString(), type: 'INFO', message: 'Gesture Engine Started' },
      ],

      addLog: (type, message) => set((state) => ({
        logs: [{ id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), type, message }, ...state.logs].slice(0, 50)
      })),

      setGesture: (gesture, confidence) => set({ lastGesture: gesture, confidence }),
    }),
    {
      name: 'gesture-desktop-storage',
    }
  )
);
