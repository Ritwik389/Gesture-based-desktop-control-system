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
        self.is_control_active = False # Integrated directly into state

state = ServerState()
tracker = HandTracker()
model = GestureModel()

# --- PERSISTENCE LOGIC ---
MODEL_PATH = "gesture_model.pkl"
DATA_PATH = "training_data.json"

def save_system():
    # Save the ML model
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    # Save the raw data for future retraining
    with open(DATA_PATH, 'w') as f:
        json.dump({"data": state.training_data, "labels": state.training_labels}, f)

def load_system():
    if os.path.exists(MODEL_PATH):
        global model
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        print(">>> Model loaded from disk.")
    if os.path.exists(DATA_PATH):
        with open(DATA_PATH, 'r') as f:
            content = json.load(f)
            state.training_data = content["data"]
            state.training_labels = content["labels"]
        print(">>> Training data loaded.")

# Load existing data on startup
load_system()

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

            # RECORDING LOGIC
            if state.mode == "RECORDING":
                if landmarks:
                    state.training_data.append(landmarks)
                    state.training_labels.append(state.target_label)
                    state.recording_count += 1
                if state.recording_count >= 50:
                    state.mode = "IDLE"

            # PREDICTION LOGIC (Only runs if trained AND (predicting mode OR monitoring active))
            elif (state.mode == "PREDICTING" or state.is_control_active) and model.is_trained:
                if landmarks:
                    detected_gesture, confidence = model.predict(landmarks)
                    
                    # TRIGGER OS ACTION
                    if state.is_control_active and confidence > 0.85:
                        controller.execute_action(detected_gesture)

            # Build UI Status
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
            await asyncio.sleep(0.01) # High performance
            
    except WebSocketDisconnect:
        print("Client Disconnected")
    finally:
        cap.release()

@app.post("/api/toggle_control")
async def toggle_control(data: dict):
    state.is_control_active = data.get("active", False)
    # If we stop monitoring, we force the mode back to IDLE
    if not state.is_control_active:
        state.mode = "IDLE"
    print(f"System Control: {state.is_control_active}")
    return {"status": "success", "active": state.is_control_active}

@app.post("/api/train")
async def train_model():
    if not state.training_data:
        return {"success": False, "message": "No data"}
    
    state.mode = "TRAINING"
    msg = model.train(state.training_data, state.training_labels)
    save_system() # Save after training
    state.mode = "IDLE"
    return {"success": True, "message": msg}

# Keep your existing /api/record and /api/status endpoints...