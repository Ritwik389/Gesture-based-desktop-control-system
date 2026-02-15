import cv2
import asyncio
import base64
import json
from pathlib import Path
from typing import Optional, Set
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
        self.default_threshold = 0.85
        self.required_consecutive_frames = 3
        self.gesture_thresholds = {}
        self.dynamic_thresholds = {}
        self.last_predicted_gesture = "None"
        self.consecutive_count = 0
        self.last_effective_threshold = self.default_threshold

state = ServerState()
tracker = HandTracker()
model = GestureModel()
clients: Set[WebSocket] = set()
camera_task: Optional[asyncio.Task] = None
camera_task_lock = asyncio.Lock()

MODEL_PATH = "models/gesture_model.pkl"
LEGACY_MODEL_PATH = "gesture_model.pkl"
MAPPINGS_PATH = "models/mappings.json"
CONFIG_PATH = "models/runtime_config.json"

def save_model():
    model.save(MODEL_PATH)
    print(">>> Model saved successfully.")

def _ensure_parent(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)

def save_mappings():
    _ensure_parent(MAPPINGS_PATH)
    with open(MAPPINGS_PATH, "w", encoding="utf-8") as f:
        json.dump({"mappings": state.active_mappings}, f, indent=2)

def load_mappings():
    if not Path(MAPPINGS_PATH).exists():
        return
    try:
        with open(MAPPINGS_PATH, "r", encoding="utf-8") as f:
            payload = json.load(f)
        saved = payload.get("mappings", {})
        if isinstance(saved, dict):
            state.active_mappings = {str(k).lower(): str(v).upper() for k, v in saved.items()}
            print(f">>> Loaded {len(state.active_mappings)} gesture mappings.")
    except Exception as e:
        print(f">>> Could not load mappings: {e}")

def save_runtime_config():
    _ensure_parent(CONFIG_PATH)
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump(
            {
                "default_threshold": state.default_threshold,
                "required_consecutive_frames": state.required_consecutive_frames,
                "gesture_thresholds": state.gesture_thresholds,
            },
            f,
            indent=2,
        )

def load_runtime_config():
    if not Path(CONFIG_PATH).exists():
        return
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            payload = json.load(f)
        state.default_threshold = float(payload.get("default_threshold", state.default_threshold))
        state.required_consecutive_frames = int(
            payload.get("required_consecutive_frames", state.required_consecutive_frames)
        )
        raw_thresholds = payload.get("gesture_thresholds", {})
        if isinstance(raw_thresholds, dict):
            state.gesture_thresholds = {
                str(k).lower(): float(v) for k, v in raw_thresholds.items()
            }
        print(">>> Loaded runtime prediction config.")
    except Exception as e:
        print(f">>> Could not load runtime config: {e}")

def load_model():
    try:
        loaded = False
        for candidate in (MODEL_PATH, LEGACY_MODEL_PATH):
            if model.load(candidate):
                print(f">>> Existing model loaded from '{candidate}'. Ready for use.")
                loaded = True
                break
        if not loaded:
            print(">>> No valid saved model found. Train once before monitoring.")
    except Exception as e:
        print(f">>> Could not load model: {e}")

# Load model on startup
load_model()
load_mappings()
load_runtime_config()

def apply_one_to_one_mappings(mapping_items):
    # Enforce: one action -> one gesture.
    # If duplicates exist for an action, the last provided row wins.
    action_to_gesture = {}
    for item in mapping_items:
        gesture = str(item.get("gesture", "")).strip().lower()
        action = str(item.get("action", "")).strip().upper()
        if not gesture or not action or action == "NONE":
            continue
        action_to_gesture[action] = gesture
    state.active_mappings = {gesture: action for action, gesture in action_to_gesture.items()}
    save_mappings()
    return state.active_mappings

def bind_action_to_gesture(action: str, gesture: str):
    action_key = str(action).strip().upper()
    gesture_key = str(gesture).strip().lower()
    if not action_key or not gesture_key:
        return state.active_mappings
    if action_key == "NONE":
        return state.active_mappings

    # Remove any existing gesture that points to this action, then bind new one.
    filtered = {g: a for g, a in state.active_mappings.items() if a != action_key}
    filtered[gesture_key] = action_key
    state.active_mappings = filtered
    save_mappings()
    return state.active_mappings

def _effective_threshold(gesture_name, confidence):
    gesture_key = gesture_name.lower()
    base = float(state.gesture_thresholds.get(gesture_key, state.default_threshold))
    prev_dynamic = float(state.dynamic_thresholds.get(gesture_key, base))
    # Adapt dynamic threshold toward current confidence, with a margin to avoid overfitting.
    target = max(0.55, min(0.98, confidence - 0.08))
    dynamic = (0.90 * prev_dynamic) + (0.10 * target)
    state.dynamic_thresholds[gesture_key] = dynamic
    return max(0.55, min(0.98, (0.70 * base) + (0.30 * dynamic)))

async def process_camera_frame(frame):
    frame, landmarks, _ = tracker.process_frame(frame)
    detected_gesture = "None"
    confidence = 0.0

    try:
        # 1. Handle Recording
        if state.mode == "RECORDING":
            if landmarks:
                state.training_data.append(landmarks)
                state.training_labels.append(state.target_label)
                state.recording_count += 1
            if state.recording_count >= 50:
                state.mode = "IDLE"

        # 2. Handle Prediction & OS Control
        elif state.is_control_active and model.is_trained:
            if landmarks:
                detected_gesture, confidence = model.predict(landmarks)
                effective_threshold = _effective_threshold(detected_gesture, confidence)
                state.last_effective_threshold = effective_threshold

                if detected_gesture == state.last_predicted_gesture and confidence >= effective_threshold:
                    state.consecutive_count += 1
                elif confidence >= effective_threshold:
                    state.last_predicted_gesture = detected_gesture
                    state.consecutive_count = 1
                else:
                    state.consecutive_count = 0
                    state.last_predicted_gesture = detected_gesture

                if state.consecutive_count >= state.required_consecutive_frames:
                    controller.execute_action(detected_gesture, state.active_mappings)
    except Exception as e:
        print(f"Frame processing error: {e}")

    # Sync UI status
    ui_status = "IDLE"
    if state.mode == "RECORDING":
        ui_status = "RECORDING"
    elif state.is_control_active:
        ui_status = "PREDICTING"

    _, buffer = cv2.imencode(".jpg", frame)
    frame_base64 = base64.b64encode(buffer).decode("utf-8")
    return {
        "image": frame_base64,
        "status": ui_status,
        "gesture": detected_gesture,
        "confidence": float(confidence),
        "progress": state.recording_count,
        "required_streak": state.required_consecutive_frames,
        "current_streak": state.consecutive_count,
        "effective_threshold": state.last_effective_threshold,
    }

async def camera_worker():
    global camera_task
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print(">>> Could not open camera.")
        camera_task = None
        return

    try:
        while clients:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.05)
                continue

            payload = await process_camera_frame(frame)
            stale_clients = []
            for ws in list(clients):
                try:
                    await ws.send_json(payload)
                except Exception:
                    stale_clients.append(ws)

            for ws in stale_clients:
                clients.discard(ws)

            await asyncio.sleep(0.01)
    finally:
        cap.release()
        camera_task = None

async def ensure_camera_worker():
    global camera_task
    async with camera_task_lock:
        if camera_task is None or camera_task.done():
            camera_task = asyncio.create_task(camera_worker())

@app.websocket("/ws/video")
async def video_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    await ensure_camera_worker()
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        print("Client Disconnected")
    finally:
        clients.discard(websocket)

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
    apply_one_to_one_mappings(new_mappings)
    print(f">>> Mappings Synced: {state.active_mappings}")
    return {"status": "success"}

@app.post("/api/bind_action_gesture")
async def bind_action_gesture(data: dict):
    action = data.get("action", "")
    gesture = data.get("gesture", "")
    updated = bind_action_to_gesture(action, gesture)
    return {"status": "success", "mappings": updated}

@app.get("/api/model_status")
async def model_status():
    return {
        "is_trained": model.is_trained,
        "classes": model.classes,
        "training_samples": model.training_samples,
        "validation_accuracy": model.validation_accuracy,
        "last_trained_at": model.last_trained_at,
        "default_threshold": state.default_threshold,
        "required_consecutive_frames": state.required_consecutive_frames,
        "gesture_thresholds": state.gesture_thresholds,
        "mappings": state.active_mappings,
        "monitoring_active": state.is_control_active,
    }

@app.post("/api/update_prediction_config")
async def update_prediction_config(data: dict):
    if "default_threshold" in data:
        state.default_threshold = max(0.55, min(0.98, float(data["default_threshold"])))
    if "required_consecutive_frames" in data:
        state.required_consecutive_frames = max(1, min(10, int(data["required_consecutive_frames"])))
    if "gesture_thresholds" in data and isinstance(data["gesture_thresholds"], dict):
        state.gesture_thresholds = {
            str(k).lower(): max(0.55, min(0.98, float(v)))
            for k, v in data["gesture_thresholds"].items()
        }
    save_runtime_config()
    return {
        "status": "success",
        "default_threshold": state.default_threshold,
        "required_consecutive_frames": state.required_consecutive_frames,
        "gesture_thresholds": state.gesture_thresholds,
    }

@app.get("/api/mappings")
async def get_mappings():
    return {"mappings": state.active_mappings}
