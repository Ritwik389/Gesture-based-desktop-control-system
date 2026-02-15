from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import cv2
import asyncio
import base64
import json
import numpy as np

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

state = ServerState()
tracker = HandTracker()
model = GestureModel()

@app.websocket("/ws/video")
async def video_endpoint(websocket: WebSocket):
    await websocket.accept()
    cap = cv2.VideoCapture(0)
    
    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                break

            frame, landmarks, _ = tracker.process_frame(frame)

            current_status = state.mode
            detected_gesture = "None"
            confidence = 0.0

            if state.mode == "RECORDING":
                if landmarks:
                    state.training_data.append(landmarks)
                    state.training_labels.append(state.target_label)
                    state.recording_count += 1
                    
                if state.recording_count >= 50:
                    state.mode = "IDLE"
                    print(f"Finished recording {state.target_label}")

            elif state.mode == "PREDICTING":
                if landmarks and model.is_trained:
                    detected_gesture, confidence = model.predict(landmarks)
                    if confidence > 0.8:
                        print(f"Detected {detected_gesture} ({confidence})")
                        controller.execute_action(detected_gesture)

            _, buffer = cv2.imencode('.jpg', frame)
            frame_base64 = base64.b64encode(buffer).decode('utf-8')

            payload = {
                "image": frame_base64,
                "status": current_status,
                "gesture": detected_gesture,
                "confidence": float(confidence),
                "progress": state.recording_count 
            }
            await websocket.send_json(payload)

            await asyncio.sleep(0.03)
            
    except WebSocketDisconnect:
        print("React Client Disconnected")
    finally:
        cap.release()


@app.post("/api/record")
async def start_recording(data: dict):

    label = data.get("label")
    state.target_label = label
    state.recording_count = 0
    state.mode = "RECORDING"
    return {"message": f"Started recording {label}"}

@app.post("/api/train")
async def train_model():

    if not state.training_data:
        return {"success": False, "message": "No data collected yet"}
    
    state.mode = "TRAINING"
    msg = model.train(state.training_data, state.training_labels)
    state.mode = "PREDICTING"
    return {"success": True, "message": msg}

@app.get("/api/status")
async def get_status():
    return {
        "mode": state.mode, 
        "samples": len(state.training_data),
        "is_trained": model.is_trained
    }