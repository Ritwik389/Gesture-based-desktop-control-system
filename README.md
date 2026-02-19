# Gesture-Based Desktop Control System

AI-powered desktop control using webcam hand gestures.

- Backend: FastAPI + MediaPipe + KNN
- Frontend: React + Vite

## Features

- Real-time webcam stream over WebSocket (`/ws/video`)
- Gesture-to-action mapping (volume, media, slides, zoom, lock)
- Multi-frame gesture recording workflow (default: 50 samples)
- Automatic retraining after recording completes
- Unknown-gesture rejection and confidence/streak smoothing
- Persistent gesture registry, runtime config, and training dataset

## Project Structure

- `backend/main.py`: API server, camera worker, training/prediction pipeline
- `backend/engine.py`: MediaPipe hand tracking + KNN model wrapper
- `backend/controller.py`: OS action execution (keyboard/system controls)
- `backend/config/gestures.json`: persisted gesture registry
- `backend/config/runtime.json`: persisted runtime prediction settings
- `backend/data/training_dataset.json`: persisted training samples
- `frontend/client/src/pages/dashboard.tsx`: monitoring controls and status
- `frontend/client/src/pages/mapping.tsx` (route `/gestures`): gesture registry editor
- `frontend/client/src/pages/monitor.tsx` (route `/live-feed`): live feed + recording

## Setup

### Backend

From project root:

```bash
cd backend
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3.10 -m uvicorn main:app --reload
```

Backend runs at `http://127.0.0.1:8000`.

### Frontend

From project root:

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in terminal.

## Current Frontend Routes

- `/` -> Dashboard
- `/gestures` -> Gesture registry
- `/live-feed` -> Live camera + gesture recording

## Recommended Training Flow

1. Open `/live-feed`.
2. Select an action and enter gesture label/emoji.
3. Click **Record Gesture Samples** (default 50 samples).
4. Keep your hand visible and vary angle/distance while recording.
5. Wait for completion toast (model auto-retrains).
6. Open `/` and click **Start Monitoring**.

## API Endpoints

### WebSocket

- `GET /ws/video`
  - Streams JPEG frames and live inference metadata.
  - Includes fields like `gesture`, `confidence`, `hand_detected`, `recording_count`, etc.

### Gesture/Training

- `POST /api/start_recording_gesture`
  - Body:
    ```json
    {
      "label": "lock",
      "action": "LOCK_SCREEN",
      "emoji": "🔒",
      "target_samples": 50
    }
    ```
  - Starts live sample collection from webcam frames.

- `POST /api/train`
  - Retrains model from full persisted dataset.

- `GET /api/gestures`
  - Returns current gesture registry and supported actions.

- `POST /api/gestures`
  - Saves full gesture registry (deduped by action), prunes stale samples, auto-retrains if needed.

### Monitoring/Runtime

- `POST /api/toggle_control`
  - Body: `{ "active": true|false }`
  - Enables/disables live action execution.

- `GET /api/model_status`
  - Returns model readiness, classes, sample count, runtime settings, and recording status.

- `POST /api/update_prediction_config`
  - Body fields:
    - `default_threshold` (0.55 to 0.98)
    - `required_consecutive_frames` (1 to 10)
    - `unknown_rejection_distance` (0.0 to 2.0, `0.0` disables this rejection gate)

## Notes

- MediaPipe is used for hand landmark detection.
- If monitoring is not detecting gestures, verify:
  - `hand_detected` is true in live stream state,
  - model is trained (`/api/model_status`),
  - gesture labels in model are still active in registry.

## macOS Permissions

If gestures are detected but no OS action runs:

1. Open **System Settings -> Privacy & Security -> Accessibility**.
2. Allow your terminal/IDE (the process running backend).
3. Restart terminal/IDE after granting access.

## Quick Start Scripts

From project root:

- `./setup.sh` -> install backend + frontend dependencies
- `./start.sh` -> run backend and frontend together
