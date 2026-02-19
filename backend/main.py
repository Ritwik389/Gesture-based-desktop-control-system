import asyncio
import base64
import hashlib
import json
from pathlib import Path
from typing import Optional, Set

import cv2
import numpy as np
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

import controller
from engine import GestureModel, HandTracker

app = FastAPI(title="JARVIS Gesture Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_PATH = Path("models/gesture_model.pkl")
TRAINING_DATA_PATH = Path("data/training_dataset.json")
GESTURE_CONFIG_PATH = Path("config/gestures.json")
RUNTIME_CONFIG_PATH = Path("config/runtime.json")


class ServerState:
    def __init__(self):
        self.mode = "IDLE"
        self.is_control_active = False
        self.default_threshold = 0.82
        self.required_consecutive_frames = 2
        self.unknown_rejection_distance = 0.85
        self.dynamic_thresholds = {}
        self.last_predicted_gesture = "none"
        self.consecutive_count = 0
        self.last_effective_threshold = self.default_threshold

        self.training_data = []
        self.training_labels = []
        self.gesture_registry = []

        self.active_mappings = {}
        self.gesture_emojis = {}
        self.gesture_thresholds = {}
        self.recording_active = False
        self.recording_label = ""
        self.recording_action = ""
        self.recording_emoji = ""
        self.recording_target = 0
        self.recording_samples = []
        self.recording_message = ""


state = ServerState()
tracker = HandTracker()
model = GestureModel()
clients: Set[WebSocket] = set()
camera_task: Optional[asyncio.Task] = None
camera_task_lock = asyncio.Lock()


def _ensure_parent(path: Path):
    path.parent.mkdir(parents=True, exist_ok=True)


def _read_json(path: Path, default):
    if not path.exists():
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _write_json(path: Path, payload):
    _ensure_parent(path)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)


def _current_dataset_signature() -> str:
    payload = {
        "samples": state.training_data,
        "labels": [str(label).strip().lower() for label in state.training_labels],
    }
    serialized = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


def _train_current_dataset():
    model.dataset_signature = _current_dataset_signature()
    return model.train(state.training_data, state.training_labels)


def _supported_actions():
    return sorted(controller.SUPPORTED_ACTIONS)


def _recording_progress_payload():
    return {
        "recording_active": state.recording_active,
        "recording_label": state.recording_label,
        "recording_action": state.recording_action,
        "recording_target": state.recording_target,
        "recording_count": len(state.recording_samples),
        "recording_message": state.recording_message,
    }


def _finalize_recording_session():
    label = state.recording_label
    action = state.recording_action
    emoji = state.recording_emoji
    samples = list(state.recording_samples)

    state.recording_active = False
    state.recording_samples = []

    if not label or not action or not samples:
        state.recording_message = "Recording ended with no usable hand samples."
        state.mode = "IDLE"
        return

    for sample in samples:
        state.training_data.append(sample)
        state.training_labels.append(label)

    replaced_label = None
    for existing in state.gesture_registry:
        if str(existing.get("action", "")).upper() == action:
            replaced_label = str(existing.get("label", "")).strip().lower()
            break

    state.gesture_registry = [g for g in state.gesture_registry if str(g.get("action", "")).upper() != action]
    state.gesture_registry.append(
        {
            "id": f"g_{len(state.gesture_registry) + 1}",
            "label": label,
            "action": action,
            "emoji": emoji,
            "threshold": state.default_threshold,
        }
    )

    removed_for_old_label = 0
    if replaced_label and replaced_label != label:
        removed_for_old_label = _remove_samples_by_label(replaced_label)

    build_runtime_maps_from_registry()
    save_registry()
    save_training_dataset()

    try:
        train_message = _train_current_dataset()
        save_model()
        state.recording_message = (
            f"Recorded {len(samples)} samples for '{label}'. "
            f"{train_message} Removed old samples: {removed_for_old_label}."
        )
    except Exception as e:
        state.recording_message = f"Recorded {len(samples)} samples, but retraining failed: {e}"

    state.mode = "IDLE"


def build_runtime_maps_from_registry():
    state.active_mappings = {}
    state.gesture_emojis = {}
    state.gesture_thresholds = {}

    for item in state.gesture_registry:
        label = str(item.get("label", "")).strip().lower()
        action = str(item.get("action", "")).strip().upper()
        emoji = str(item.get("emoji", "")).strip()
        threshold = float(item.get("threshold", state.default_threshold))

        if not label or not action or action == "NONE":
            continue

        state.active_mappings[label] = action
        state.gesture_emojis[label] = emoji
        state.gesture_thresholds[label] = max(0.55, min(0.98, threshold))


def save_registry():
    _write_json(GESTURE_CONFIG_PATH, {"gestures": state.gesture_registry})


def load_registry():
    payload = _read_json(GESTURE_CONFIG_PATH, {"gestures": []})
    gestures = payload.get("gestures", [])
    if isinstance(gestures, list):
        state.gesture_registry = gestures
    build_runtime_maps_from_registry()


def save_runtime_config():
    _write_json(
        RUNTIME_CONFIG_PATH,
        {
            "default_threshold": state.default_threshold,
            "required_consecutive_frames": state.required_consecutive_frames,
            "unknown_rejection_distance": state.unknown_rejection_distance,
        },
    )


def load_runtime_config():
    payload = _read_json(
        RUNTIME_CONFIG_PATH,
        {
            "default_threshold": state.default_threshold,
            "required_consecutive_frames": state.required_consecutive_frames,
            "unknown_rejection_distance": state.unknown_rejection_distance,
        },
    )
    state.default_threshold = float(payload.get("default_threshold", state.default_threshold))
    state.required_consecutive_frames = int(
        payload.get("required_consecutive_frames", state.required_consecutive_frames)
    )
    state.unknown_rejection_distance = float(
        payload.get("unknown_rejection_distance", state.unknown_rejection_distance)
    )


def save_training_dataset():
    _write_json(
        TRAINING_DATA_PATH,
        {
            "samples": state.training_data,
            "labels": state.training_labels,
        },
    )


def load_training_dataset():
    payload = _read_json(TRAINING_DATA_PATH, {"samples": [], "labels": []})
    samples = payload.get("samples", [])
    labels = payload.get("labels", [])
    if isinstance(samples, list) and isinstance(labels, list) and len(samples) == len(labels):
        state.training_data = samples
        state.training_labels = labels


def _remove_samples_by_label(label: str):
    if not label:
        return 0
    label = str(label).strip().lower()
    kept_samples = []
    kept_labels = []
    removed = 0
    for sample, sample_label in zip(state.training_data, state.training_labels):
        if str(sample_label).strip().lower() == label:
            removed += 1
            continue
        kept_samples.append(sample)
        kept_labels.append(sample_label)
    state.training_data = kept_samples
    state.training_labels = kept_labels
    return removed


def _prune_dataset_to_registry():
    active_labels = {str(item.get("label", "")).strip().lower() for item in state.gesture_registry}
    active_labels.discard("")
    if not active_labels:
        removed = len(state.training_labels)
        state.training_data = []
        state.training_labels = []
        return removed
    kept_samples = []
    kept_labels = []
    removed = 0
    for sample, sample_label in zip(state.training_data, state.training_labels):
        if str(sample_label).strip().lower() in active_labels:
            kept_samples.append(sample)
            kept_labels.append(sample_label)
        else:
            removed += 1
    state.training_data = kept_samples
    state.training_labels = kept_labels
    return removed


def _is_model_dataset_synced():
    if not model.is_trained:
        return False
    model_signature = str(getattr(model, "dataset_signature", "") or "")
    if not model_signature:
        return False
    if model_signature != _current_dataset_signature():
        return False
    model_classes = {str(c).strip().lower() for c in (model.classes or [])}
    dataset_classes = {str(c).strip().lower() for c in state.training_labels}
    return bool(model_classes) and model_classes == dataset_classes


def _reset_model_state():
    model.is_trained = False
    model.classes = []
    model.validation_accuracy = None
    model.training_samples = 0
    model.last_trained_at = None
    model.last_neighbor_distance = None
    model.dataset_signature = None
    state.dynamic_thresholds = {}
    state.last_predicted_gesture = "none"
    state.consecutive_count = 0
    state.is_control_active = False
    state.recording_active = False
    state.recording_samples = []
    state.recording_message = ""
    if MODEL_PATH.exists():
        MODEL_PATH.unlink(missing_ok=True)


def save_model():
    model.save(str(MODEL_PATH))


def load_model():
    loaded = model.load(str(MODEL_PATH))
    if loaded:
        print(">>> JARVIS model loaded")
    else:
        print(">>> JARVIS model not found yet")


def _decode_base64_image(image_data: str):
    if not image_data:
        return None
    payload = image_data.split(",", 1)[1] if "," in image_data else image_data
    raw = base64.b64decode(payload)
    arr = np.frombuffer(raw, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


def _extract_hand_crop(frame):
    h, w = frame.shape[:2]
    img_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = tracker.hands.process(img_rgb)
    if not results.multi_hand_landmarks:
        return None

    hand = results.multi_hand_landmarks[0]
    xs = [lm.x for lm in hand.landmark]
    ys = [lm.y for lm in hand.landmark]

    min_x = max(0.0, min(xs))
    min_y = max(0.0, min(ys))
    max_x = min(1.0, max(xs))
    max_y = min(1.0, max(ys))

    box_w = max_x - min_x
    box_h = max_y - min_y
    padding = 0.24

    x1 = int(max(0, (min_x - (box_w * padding)) * w))
    y1 = int(max(0, (min_y - (box_h * padding)) * h))
    x2 = int(min(w, (max_x + (box_w * padding)) * w))
    y2 = int(min(h, (max_y + (box_h * padding)) * h))

    if x2 <= x1 or y2 <= y1:
        return None

    crop = frame[y1:y2, x1:x2]
    if crop.size == 0:
        return None

    area_ratio = float(((x2 - x1) * (y2 - y1)) / float(max(1, w * h)))
    return {"crop": crop, "box": [x1, y1, x2, y2], "area_ratio": area_ratio}


def _assess_image_quality(frame, hand_crop_payload=None):
    payload = hand_crop_payload if hand_crop_payload is not None else _extract_hand_crop(frame)
    if payload is None:
        return {
            "ok": False,
            "score": 0.0,
            "message": "No hand detected. Please recapture with your hand clearly visible.",
            "details": {"brightness": 0.0, "blur_var": 0.0, "hand_area_ratio": 0.0},
        }

    crop = payload["crop"]
    hand_area_ratio = float(payload["area_ratio"])
    gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
    brightness = float(np.mean(gray))
    blur_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())

    score = 1.0
    reasons = []

    # Less strict gate: reject only clearly unusable frames.
    if brightness < 22:
        score -= 0.25
        reasons.append("too dark")
    elif brightness > 248:
        score -= 0.15
        reasons.append("too bright")

    if blur_var < 18:
        score -= 0.35
        reasons.append("blurry")

    if hand_area_ratio < 0.018:
        score -= 0.25
        reasons.append("hand too small in frame")

    score = max(0.0, min(1.0, score))
    ok = score >= 0.45

    if ok:
        message = "Image quality is acceptable."
    else:
        reason_text = ", ".join(reasons) if reasons else "insufficient quality"
        message = f"Image quality is low ({reason_text}). Please capture again."

    return {
        "ok": ok,
        "score": score,
        "message": message,
        "details": {
            "brightness": brightness,
            "blur_var": blur_var,
            "hand_area_ratio": hand_area_ratio,
        },
    }


def _augment_landmarks(landmarks, count=48):
    base = np.array(landmarks, dtype=np.float32).reshape(-1, 3)
    augmented = [base.flatten().tolist()]

    for _ in range(max(1, count - 1)):
        sample = base.copy()
        angle = np.random.uniform(-0.20, 0.20)
        scale = np.random.uniform(0.90, 1.12)
        noise = np.random.normal(0.0, 0.014, sample.shape)

        rot = np.array(
            [
                [np.cos(angle), -np.sin(angle), 0.0],
                [np.sin(angle), np.cos(angle), 0.0],
                [0.0, 0.0, 1.0],
            ],
            dtype=np.float32,
        )

        sample = (sample @ rot.T) * scale
        sample = sample + noise
        augmented.append(sample.flatten().tolist())

    return augmented


def _landmark_distance(a, b):
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    return float(np.linalg.norm(va - vb))


def _augment_frame_variants(frame, count=48):
    h, w = frame.shape[:2]
    variants = [frame.copy()]

    for _ in range(max(1, count - 1)):
        img = frame.copy()

        # Keep transforms moderate to avoid unrealistic hand geometry.
        angle = float(np.random.uniform(-10.0, 10.0))
        scale = float(np.random.uniform(0.93, 1.08))
        tx = float(np.random.uniform(-0.04 * w, 0.04 * w))
        ty = float(np.random.uniform(-0.04 * h, 0.04 * h))
        M = cv2.getRotationMatrix2D((w / 2.0, h / 2.0), angle, scale)
        M[0, 2] += tx
        M[1, 2] += ty
        img = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT_101)

        # Mild photometric jitter.
        alpha = float(np.random.uniform(0.86, 1.16))
        beta = float(np.random.uniform(-18.0, 18.0))
        img = cv2.convertScaleAbs(img, alpha=alpha, beta=beta)

        # HSV jitter
        hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[..., 0] = (hsv[..., 0] + np.random.uniform(-6.0, 6.0)) % 180.0
        hsv[..., 1] = np.clip(hsv[..., 1] * np.random.uniform(0.88, 1.14), 0, 255)
        hsv[..., 2] = np.clip(hsv[..., 2] * np.random.uniform(0.88, 1.14), 0, 255)
        img = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)

        # Optional blur or noise (low probability).
        if np.random.rand() < 0.22:
            k = int(np.random.choice([3]))
            img = cv2.GaussianBlur(img, (k, k), 0)
        if np.random.rand() < 0.20:
            noise = np.random.normal(0.0, np.random.uniform(2.0, 7.0), img.shape).astype(np.float32)
            img = np.clip(img.astype(np.float32) + noise, 0, 255).astype(np.uint8)

        # Optional edge emphasis via Canny (very light blend).
        if np.random.rand() < 0.12:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, threshold1=70, threshold2=140)
            edges_bgr = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)
            img = cv2.addWeighted(img, 0.88, edges_bgr, 0.12, 0)

        variants.append(img)

    return variants


def _effective_threshold(gesture_name: str, confidence: float):
    key = gesture_name.lower()
    base = float(state.gesture_thresholds.get(key, state.default_threshold))
    prev_dyn = float(state.dynamic_thresholds.get(key, base))
    target = max(0.55, min(0.98, confidence - 0.08))
    dyn = (0.90 * prev_dyn) + (0.10 * target)
    state.dynamic_thresholds[key] = dyn
    return max(0.55, min(0.98, (0.70 * base) + (0.30 * dyn)))


async def process_camera_frame(frame):
    frame, landmarks, _ = tracker.process_frame(frame)
    detected_gesture = "none"
    detected_emoji = ""
    confidence = 0.0
    hand_detected = bool(landmarks)
    neighbor_distance = None
    rejection_reason = ""

    try:
        if state.recording_active and landmarks:
            is_novel = True
            for existing in state.recording_samples:
                if _landmark_distance(existing, landmarks) < 0.014:
                    is_novel = False
                    break
            if is_novel:
                state.recording_samples.append(landmarks)
                if len(state.recording_samples) >= state.recording_target:
                    _finalize_recording_session()

        if state.is_control_active and model.is_trained and landmarks:
            detected_gesture, confidence = model.predict(landmarks)
            detected_gesture = str(detected_gesture).lower()
            neighbor_distance = model.last_neighbor_distance

            # Reject out-of-distribution gestures so KNN does not force random known labels.
            if (
                state.unknown_rejection_distance > 0
                and
                neighbor_distance is not None
                and len(model.classes) > 1
                and neighbor_distance > state.unknown_rejection_distance
            ):
                detected_gesture = "none"
                confidence = 0.0
                rejection_reason = "unknown_distance"
            elif detected_gesture not in state.active_mappings:
                # Do not surface stale labels that are no longer part of the active gesture registry.
                detected_gesture = "none"
                confidence = 0.0
                rejection_reason = "inactive_label"

            detected_emoji = state.gesture_emojis.get(detected_gesture, "")

            eff = _effective_threshold(detected_gesture, confidence)
            state.last_effective_threshold = eff

            if detected_gesture == state.last_predicted_gesture and confidence >= eff:
                state.consecutive_count += 1
            elif confidence >= eff:
                state.last_predicted_gesture = detected_gesture
                state.consecutive_count = 1
            else:
                state.last_predicted_gesture = detected_gesture
                state.consecutive_count = 0

            if state.consecutive_count >= state.required_consecutive_frames:
                controller.execute_action(detected_gesture, state.active_mappings)
    except Exception as e:
        print(f"Frame processing error: {e}")

    if state.recording_active:
        ui_status = "RECORDING"
    else:
        ui_status = "PREDICTING" if state.is_control_active else "IDLE"

    _, buffer = cv2.imencode(".jpg", frame)
    frame_base64 = base64.b64encode(buffer).decode("utf-8")

    return {
        "image": frame_base64,
        "status": ui_status,
        "gesture": detected_gesture,
        "emoji": detected_emoji,
        "confidence": float(confidence),
        "hand_detected": hand_detected,
        "neighbor_distance": float(neighbor_distance) if neighbor_distance is not None else None,
        "rejection_reason": rejection_reason,
        "required_streak": state.required_consecutive_frames,
        "current_streak": state.consecutive_count,
        "effective_threshold": state.last_effective_threshold,
        **_recording_progress_payload(),
    }


async def camera_worker():
    global camera_task
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print(">>> Could not open camera")
        camera_task = None
        return

    try:
        while clients:
            ret, frame = cap.read()
            if not ret:
                await asyncio.sleep(0.05)
                continue

            payload = await process_camera_frame(frame)
            stale = []
            for ws in list(clients):
                try:
                    await ws.send_json(payload)
                except Exception:
                    stale.append(ws)

            for ws in stale:
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
        print("Client disconnected")
    finally:
        clients.discard(websocket)


@app.post("/api/toggle_control")
async def toggle_control(data: dict):
    target_active = bool(data.get("active", False))
    if target_active and state.recording_active:
        return {"status": "error", "success": False, "message": "Cannot monitor while recording gesture samples"}
    if target_active:
        if not model.is_trained:
            return {"status": "error", "success": False, "message": "Model is not trained yet"}
        if not _is_model_dataset_synced():
            return {
                "status": "error",
                "success": False,
                "message": "Model and dataset are out of sync. Please retrain.",
            }
    state.is_control_active = target_active
    return {"status": "success", "active": state.is_control_active}


@app.post("/api/start_recording_gesture")
async def start_recording_gesture(data: dict):
    if state.recording_active:
        return {"success": False, "message": "A recording session is already active"}

    label = str(data.get("label", "")).strip().lower()
    action = str(data.get("action", "")).strip().upper()
    emoji = str(data.get("emoji", "")).strip()
    target_samples = max(20, min(120, int(data.get("target_samples", 50))))

    if not label:
        return {"success": False, "message": "Missing label"}
    if action not in _supported_actions():
        return {"success": False, "message": "Unsupported action"}

    state.is_control_active = False
    state.mode = "RECORDING"
    state.recording_active = True
    state.recording_label = label
    state.recording_action = action
    state.recording_emoji = emoji
    state.recording_target = target_samples
    state.recording_samples = []
    state.recording_message = f"Recording started for '{label}'. Keep your gesture visible and vary angles."

    return {
        "success": True,
        "message": state.recording_message,
        **_recording_progress_payload(),
    }


@app.post("/api/upload_gesture_image")
async def upload_gesture_image(data: dict):
    label = str(data.get("label", "")).strip().lower()
    action = str(data.get("action", "")).strip().upper()
    emoji = str(data.get("emoji", "")).strip()
    image_data = data.get("image", "")
    augment_count = int(data.get("augment_count", 48))

    if not label:
        return {"success": False, "message": "Missing label"}
    if action not in _supported_actions():
        return {"success": False, "message": "Unsupported action"}
    if not image_data:
        return {"success": False, "message": "Missing image"}

    frame = _decode_base64_image(image_data)
    if frame is None:
        return {"success": False, "message": "Invalid image data"}

    hand_crop_payload = _extract_hand_crop(frame)
    quality = _assess_image_quality(frame, hand_crop_payload)
    quality_warning = None
    if not quality["ok"]:
        # Do not hard reject if landmarks can still be extracted for training.
        quality_warning = quality["message"]

    working_frame = hand_crop_payload["crop"] if hand_crop_payload else frame
    _, landmarks, _ = tracker.process_frame(working_frame)
    if not landmarks:
        # Fallback to full frame once before rejecting.
        _, landmarks, _ = tracker.process_frame(frame)
        if not landmarks:
            return {
                "success": False,
                "message": quality_warning or "No hand detected in image",
                "quality_score": quality["score"],
                "quality_details": quality["details"],
            }

    # Cap augmentation count to prevent overfitting from one captured image.
    requested_count = max(8, min(40, augment_count))
    frame_variants = _augment_frame_variants(working_frame, requested_count)
    samples = []
    base_landmarks = landmarks

    for candidate in frame_variants:
        _, aug_landmarks, _ = tracker.process_frame(candidate)
        if not aug_landmarks:
            continue
        # Keep only meaningful but realistic variations.
        dist_from_base = _landmark_distance(base_landmarks, aug_landmarks)
        if dist_from_base < 0.035 or dist_from_base > 1.6:
            continue
        if any(_landmark_distance(existing, aug_landmarks) < 0.018 for existing in samples):
            continue
        samples.append(aug_landmarks)
        if len(samples) >= requested_count:
            break

    # Fallback: if image-level augmentation failed often, complete using landmark jitter.
    min_target = max(10, requested_count // 2)
    if len(samples) < min_target:
        needed = requested_count - len(samples)
        for lm in _augment_landmarks(landmarks, max(1, needed)):
            if any(_landmark_distance(existing, lm) < 0.015 for existing in samples):
                continue
            samples.append(lm)
            if len(samples) >= requested_count:
                break

    for sample in samples:
        state.training_data.append(sample)
        state.training_labels.append(label)

    replaced_label = None
    for existing in state.gesture_registry:
        if str(existing.get("action", "")).upper() == action:
            replaced_label = str(existing.get("label", "")).strip().lower()
            break

    # Upsert gesture config by action: one gesture per action.
    state.gesture_registry = [g for g in state.gesture_registry if str(g.get("action", "")).upper() != action]
    state.gesture_registry.append(
        {
            "id": f"g_{len(state.gesture_registry) + 1}",
            "label": label,
            "action": action,
            "emoji": emoji,
            "threshold": state.default_threshold,
        }
    )
    # Replace old mapping data for that action to avoid stale class predictions.
    removed_for_old_label = 0
    if replaced_label and replaced_label != label:
        removed_for_old_label = _remove_samples_by_label(replaced_label)

    build_runtime_maps_from_registry()
    save_registry()
    save_training_dataset()

    return {
        "success": True,
        "message": f"Added {len(samples)} augmented samples for '{label}'",
        "label": label,
        "count": len(samples),
        "requested_count": requested_count,
        "quality_score": quality["score"],
        "quality_passed": quality["ok"],
        "quality_warning": quality_warning,
        "removed_replaced_samples": removed_for_old_label,
    }


@app.post("/api/assess_gesture_image")
async def assess_gesture_image(data: dict):
    image_data = data.get("image", "")
    if not image_data:
        return {"ok": False, "message": "Missing image"}

    frame = _decode_base64_image(image_data)
    if frame is None:
        return {"ok": False, "message": "Invalid image data"}

    hand_crop_payload = _extract_hand_crop(frame)
    result = _assess_image_quality(frame, hand_crop_payload)
    return {
        "ok": result["ok"],
        "score": result["score"],
        "message": result["message"],
        "details": result["details"],
    }


@app.post("/api/train")
async def train_model():
    if not state.training_data:
        return {"success": False, "message": "No data"}

    state.mode = "TRAINING"
    try:
        message = _train_current_dataset()
        save_model()
        save_training_dataset()
        return {"success": True, "message": message}
    except Exception as e:
        return {"success": False, "message": f"Training failed: {e}"}
    finally:
        state.mode = "IDLE"


@app.get("/api/gestures")
async def get_gestures():
    return {
        "gestures": state.gesture_registry,
        "supported_actions": _supported_actions(),
    }


@app.post("/api/gestures")
async def save_gestures(data: dict):
    gestures = data.get("gestures", [])
    if not isinstance(gestures, list):
        return {"success": False, "message": "Invalid gestures payload"}

    # One gesture per action, last wins.
    old_registry = list(state.gesture_registry)
    dedup = {}
    for item in gestures:
        action = str(item.get("action", "")).strip().upper()
        label = str(item.get("label", "")).strip().lower()
        if action not in _supported_actions() or not label:
            continue
        dedup[action] = {
            "id": str(item.get("id", f"g_{len(dedup) + 1}")),
            "label": label,
            "action": action,
            "emoji": str(item.get("emoji", "")).strip(),
            "threshold": max(0.55, min(0.98, float(item.get("threshold", state.default_threshold)))),
        }

    new_registry = list(dedup.values())

    # Preserve training data when labels are renamed for the same action.
    old_label_to_action = {
        str(item.get("label", "")).strip().lower(): str(item.get("action", "")).strip().upper()
        for item in old_registry
    }
    new_action_to_label = {
        str(item.get("action", "")).strip().upper(): str(item.get("label", "")).strip().lower()
        for item in new_registry
    }

    relabeled = 0
    relabeled_labels = []
    for sample_label in state.training_labels:
        old_label = str(sample_label).strip().lower()
        action = old_label_to_action.get(old_label)
        if action and action in new_action_to_label:
            new_label = new_action_to_label[action]
            if new_label != old_label:
                relabeled += 1
            relabeled_labels.append(new_label)
        else:
            relabeled_labels.append(old_label)
    state.training_labels = relabeled_labels

    state.gesture_registry = new_registry
    build_runtime_maps_from_registry()
    removed = _prune_dataset_to_registry()
    save_registry()
    save_training_dataset()

    auto_retrained = False
    retrain_message = "No retraining needed."

    if not state.gesture_registry:
        _reset_model_state()
        retrain_message = "No gestures configured. Cleared dataset and reset model."
        return {
            "success": True,
            "gestures": state.gesture_registry,
            "pruned_samples": removed,
            "relabeled_samples": relabeled,
            "auto_retrained": False,
            "retrain_message": retrain_message,
        }

    # If dataset changed due to removal or relabeling, retrain automatically.
    if removed > 0 or relabeled > 0:
        if state.training_data:
            try:
                retrain_message = _train_current_dataset()
                save_model()
                auto_retrained = True
            except Exception as e:
                retrain_message = f"Auto-retrain failed: {e}"
        else:
            # No training data left after removals.
            _reset_model_state()
            retrain_message = "All gesture samples were removed. Model is now untrained."

    return {
        "success": True,
        "gestures": state.gesture_registry,
        "pruned_samples": removed,
        "relabeled_samples": relabeled,
        "auto_retrained": auto_retrained,
        "retrain_message": retrain_message,
    }


@app.post("/api/update_prediction_config")
async def update_prediction_config(data: dict):
    if "default_threshold" in data:
        state.default_threshold = max(0.55, min(0.98, float(data["default_threshold"])))
    if "required_consecutive_frames" in data:
        state.required_consecutive_frames = max(1, min(10, int(data["required_consecutive_frames"])))
    if "unknown_rejection_distance" in data:
        state.unknown_rejection_distance = max(0.0, min(2.0, float(data["unknown_rejection_distance"])))
    save_runtime_config()
    return {
        "status": "success",
        "default_threshold": state.default_threshold,
        "required_consecutive_frames": state.required_consecutive_frames,
        "unknown_rejection_distance": state.unknown_rejection_distance,
    }


@app.get("/api/model_status")
async def model_status():
    return {
        "is_trained": model.is_trained,
        "classes": model.classes,
        "training_samples": len(state.training_data),
        "validation_accuracy": model.validation_accuracy,
        "last_trained_at": model.last_trained_at,
        "default_threshold": state.default_threshold,
        "required_consecutive_frames": state.required_consecutive_frames,
        "unknown_rejection_distance": state.unknown_rejection_distance,
        "monitoring_active": state.is_control_active,
        "gestures_count": len(state.gesture_registry),
        **_recording_progress_payload(),
    }


# Boot sequence
load_runtime_config()
load_registry()
load_training_dataset()
pruned_on_boot = _prune_dataset_to_registry()
if pruned_on_boot > 0:
    save_training_dataset()
    print(f">>> Pruned {pruned_on_boot} stale samples not present in gesture registry")
load_model()
if pruned_on_boot > 0 and state.training_data:
    try:
        msg = _train_current_dataset()
        save_model()
        print(f">>> Auto-retrained on boot after prune: {msg}")
    except Exception as e:
        print(f">>> Auto-retrain on boot failed: {e}")
