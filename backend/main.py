import cv2
import asyncio
import base64
import json
import os
import pickle
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from engine import HandTracker, GestureModel
import controller 

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ServerState:
    def __init__(self):
        self.mode = "IDLE"     
        self.target_label = ""   
        self.recording_count = 0 
        self.training_data = []    
        self.training_labels = [] 
        self.is_control_active = False 
        self.active_mappings = {}

state = ServerState()
tracker = HandTracker()
model = GestureModel()


MODEL_PATH = "gesture_model.pkl"

def save_model():
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    print(">>> Model saved successfully.")

def load_model():
    global model
    if os.path.exists(MODEL_PATH):
        try:
            with open(MODEL_PATH, 'rb') as f:
                model = pickle.load(f)
            print(">>> Existing model loaded. Ready for use.")
        except Exception as e:
            print(f">>> Could not load model: {e}")

# Load model on startup
load_model()

@app.websocket("/ws/video")
async def video_endpoint(websocket: WebSocket):
    await websocket.accept()
    cap = cv2.VideoCapture(0)
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret: break

            frame, landmarks, _ = tracker.process_frame(frame)
            detected_gesture = "None"
            confidence = 0.0

            # 1. Handle Recording
            if state.mode == "RECORDING":
                if landmarks:
                    state.training_data.append(landmarks)
                    state.training_labels.append(state.target_label)
                    state.recording_count += 1
                if state.recording_count >= 50:
                    state.mode = "IDLE"

            # 2. Handle Prediction & OS Control
            # Runs only if (Explicit Predicting Mode OR Start Monitoring is ON)
            elif (state.mode == "PREDICTING" or state.is_control_active) and model.is_trained:
                if landmarks:
                    detected_gesture, confidence = model.predict(landmarks)
                    
                    # Only trigger hardware if Monitoring is specifically turned ON
                    if state.is_control_active and confidence > 0.85:

                        controller.execute_action(detected_gesture, state.active_mappings)

            # Sync UI status
            ui_status = "IDLE"
            if state.mode == "RECORDING": ui_status = "RECORDING"
            elif state.is_control_active: ui_status = "PREDICTING"

            _, buffer = cv2.imencode('.jpg', frame)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')

            await websocket.send_json({
                "image": frame_base64,
                "status": ui_status,
                "gesture": detected_gesture,
                "confidence": float(confidence),
                "progress": state.recording_count 
            })
            await asyncio.sleep(0.01)
            
    except WebSocketDisconnect:
        print("Client Disconnected")
    finally:
        cap.release()

@app.post("/api/toggle_control")
async def toggle_control(data: dict):
    state.is_control_active = data.get("active", False)
    # Ensure mode resets when stopping
    if not state.is_control_active:
        state.mode = "IDLE"
    print(f"OS Monitoring: {'ENABLED' if state.is_control_active else 'DISABLED'}")
    return {"status": "success", "active": state.is_control_active}

@app.post("/api/train")
async def train_model():
    if not state.training_data:
        return {"success": False, "message": "No data"}
    
    state.mode = "TRAINING"
    msg = model.train(state.training_data, state.training_labels)
    save_model() # Save model so it persists after restart
    state.mode = "IDLE"
    return {"success": True, "message": msg}

@app.post("/api/record")
async def start_recording(data: dict):
    state.target_label = data.get("label")
    state.recording_count = 0
    state.mode = "RECORDING"
    return {"message": "Recording started"}

@app.post("/api/sync_mappings")
async def sync_mappings(data: dict):
    # Data format: [{"gesture": "ROCK", "action": "VOLUME_UP"}, ...]
    new_mappings = data.get("mappings", [])
    # Convert list to a dictionary for fast lookup: {"ROCK": "VOLUME_UP"}
    state.active_mappings = {m['gesture'].lower(): m['action'] for m in new_mappings}
    print(f">>> Mappings Synced: {state.active_mappings}")
    return {"status": "success"}