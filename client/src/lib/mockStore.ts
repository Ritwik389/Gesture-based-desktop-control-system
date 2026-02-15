import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type GestureType = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | 'OPEN_PALM' | 'CLOSED_FIST' | 'NONE';
export type DroneAction = 'HOVER' | 'TAKEOFF' | 'LAND' | 'MOVE_UP' | 'MOVE_DOWN' | 'ROTATE_LEFT' | 'ROTATE_RIGHT' | 'Flip' | 'NONE';
export type SystemStatus = 'ONLINE' | 'OFFLINE' | 'ERROR' | 'CONNECTING';

export interface GestureMapping {
  gesture: GestureType;
  action: DroneAction;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';
  message: string;
}

interface AppState {
  // Auth
  isAuthenticated: boolean;
  user: { name: string; email: string } | null;
  login: (email: string) => void;
  logout: () => void;

  // Real-time Data (Simulated)
  lastGesture: GestureType;
  confidence: number;
  droneStatus: 'IDLE' | 'FLYING' | 'RETURNING' | 'LANDED' | 'EMERGENCY';
  batteryLevel: number;
  wifiSignal: number;
  
  // Settings
  mappings: GestureMapping[];
  updateMapping: (gesture: GestureType, action: DroneAction) => void;

  // ML Training
  isTraining: boolean;
  trainingProgress: number;
  lastTrained: string | null;
  startTraining: () => void;

  // System
  wsStatus: SystemStatus;
  mlStatus: SystemStatus;
  backendStatus: SystemStatus;
  
  // Logs
  logs: LogEntry[];
  addLog: (type: LogEntry['type'], message: string) => void;

  // Actions
  setGesture: (gesture: GestureType, confidence: number) => void;
  toggleDroneStatus: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      login: (email) => set({ isAuthenticated: true, user: { name: 'Admin User', email } }),
      logout: () => set({ isAuthenticated: false, user: null }),

      lastGesture: 'NONE',
      confidence: 0,
      droneStatus: 'LANDED',
      batteryLevel: 85,
      wifiSignal: 92,

      mappings: [
        { gesture: 'UP', action: 'MOVE_UP' },
        { gesture: 'DOWN', action: 'MOVE_DOWN' },
        { gesture: 'LEFT', action: 'ROTATE_LEFT' },
        { gesture: 'RIGHT', action: 'ROTATE_RIGHT' },
        { gesture: 'OPEN_PALM', action: 'HOVER' },
        { gesture: 'CLOSED_FIST', action: 'LAND' },
      ],

      updateMapping: (gesture, action) => 
        set((state) => ({
          mappings: state.mappings.map(m => m.gesture === gesture ? { ...m, action } : m)
        })),

      isTraining: false,
      trainingProgress: 0,
      lastTrained: new Date().toISOString(),
      
      startTraining: () => {
        set({ isTraining: true, trainingProgress: 0 });
        const interval = setInterval(() => {
          const { trainingProgress } = get();
          if (trainingProgress >= 100) {
            clearInterval(interval);
            set({ isTraining: false, trainingProgress: 0, lastTrained: new Date().toISOString() });
            get().addLog('SUCCESS', 'Model retraining completed successfully');
          } else {
            set({ trainingProgress: trainingProgress + 10 });
          }
        }, 500);
      },

      wsStatus: 'ONLINE',
      mlStatus: 'ONLINE',
      backendStatus: 'ONLINE',

      logs: [
        { id: '1', timestamp: new Date().toISOString(), type: 'INFO', message: 'System initialized' },
      ],

      addLog: (type, message) => set((state) => ({
        logs: [{ id: Math.random().toString(36).substr(2, 9), timestamp: new Date().toISOString(), type, message }, ...state.logs].slice(0, 50)
      })),

      setGesture: (gesture, confidence) => set({ lastGesture: gesture, confidence }),
      
      toggleDroneStatus: () => set((state) => ({
        droneStatus: state.droneStatus === 'LANDED' ? 'FLYING' : 'LANDED'
      }))
    }),
    {
      name: 'aerogesture-storage',
      partialize: (state) => ({ 
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        mappings: state.mappings,
        lastTrained: state.lastTrained
      }),
    }
  )
);
