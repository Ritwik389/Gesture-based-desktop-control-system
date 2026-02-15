# 🖐️ Gesture-Based Desktop Control System

**Project Overview**
This is an AI-powered desktop controller that allows you to control your computer (volume, media, window switching) using hand gestures. It uses a webcam to track your hand in real-time and maps specific gestures (like "Rock" or "Paper") to keyboard shortcuts.

### 🛠️ Tech Stack
* **Language:** Python 3.10
* **Computer Vision:** OpenCV & MediaPipe (for hand tracking)
* **AI Model:** Scikit-Learn (K-Nearest Neighbors Classifier)
* **API Framework:** FastAPI (to communicate with the Frontend)
* **Automation:** PyAutoGUI (to control the keyboard/mouse)

---

## 🚀 Setup Guide (For Mac/Linux)

### 1. Prerequisites
Ensure you have **Python 3.10** installed.
```bash
python3.10 --version
# If not installed: brew install python@3.10
```

### 2. Installation
Open your terminal in the project folder and run these commands to set up the environment:

```bash
# 1. Create a virtual environment
python3.10 -m venv venv

# 2. Activate the environment
source venv/bin/activate

# 3. Install dependencies (Approx. 2 mins)
pip install "mediapipe==0.10.9" "protobuf<4.25.0" opencv-python scikit-learn pyautogui fastapi uvicorn websockets
```

---

## ⚠️ CRITICAL: Mac Permissions
**If you do not do this, the AI will see your hand but the computer will ignore the commands.**

1.  Open **System Settings** → **Privacy & Security** → **Accessibility**.
2.  Find **Terminal** (or **VS Code**, if you run it from there).
3.  **Toggle the switch ON.**
4.  **Restart your Terminal app completely.** (The new setting won't work until you restart).

---

## 🏃‍♂️ How to Run the System

### Step 1: Start the Server
In your terminal (inside the `backend` folder):
```bash
source venv/bin/activate
python -m uvicorn main:app --reload
```
*Wait until you see:* `INFO: Uvicorn running on http://127.0.0.1:8000`

### Step 2: Open the "Eye" (Camera Feed)
Since there is no frontend yet, we use a test file to turn on the camera.
1.  Go to the `backend` folder in Finder.
2.  Double-click `test_stream.html` to open it in Chrome/Safari.
3.  **Verify:** You should see your webcam feed and a stream of JSON data.

---

## 🎮 How to Train & Use Gestures
The system starts "blank." You must teach it your gestures. Use a **second terminal window** to send these commands.

### 1. Record "Rock" (Mute Volume)
Hold a **Fist** to the camera and run:
```bash
curl -X POST "http://127.0.0.1:8000/api/record" -H "Content-Type: application/json" -d '{"label": "rock"}'
```
*Move your hand slightly while it records for 3 seconds.*

### 2. Record "Paper" (Play/Pause Music)
Hold an **Open Palm** to the camera and run:
```bash
curl -X POST "http://127.0.0.1:8000/api/record" -H "Content-Type: application/json" -d '{"label": "paper"}'
```

### 3. Record "Nothing" (The Dead Zone)
**Important:** Move your hand randomly (scratch nose, type, drink water) to teach the AI what "not a gesture" looks like.
```bash
curl -X POST "http://127.0.0.1:8000/api/record" -H "Content-Type: application/json" -d '{"label": "nothing"}'
```

### 4. Train the Brain
Run this command to compile the data into a smart model:
```bash
curl -X POST "http://127.0.0.1:8000/api/train"
```

### 5. Test It!
* Open Spotify.
* Show **Paper** -> Music should Pause.
* Show **Rock** -> Volume should Mute.

---

## 📂 File Structure
* `main.py`: The brain. Starts the server and handles the webcam.
* `engine.py`: The eyes. Uses MediaPipe to find hand landmarks.
* `controller.py`: The hands. Contains the mappings (e.g., "If Rock -> Mute").
* `test_stream.html`: A simple tool to view the camera feed during development.

---

## ❓ Troubleshooting
* **Error: `Module not found`?**
    * Make sure you activated the venv: `source venv/bin/activate`.
* **Camera doesn't open?**
    * Make sure `test_stream.html` is open in a browser. The camera only turns on when someone is watching.
* **Gestures detected but nothing happens?**
    * Check the **Mac Permissions** section above. You likely need to re-toggle "Accessibility" for your Terminal.

## Frontend Installation (The Dashboard)

* **Open a new terminal tab, navigate to the frontend folder, and run:**

// Bash
# 1. Install React dependencies
 * npm install

# 2. Start the development server
 *npm run dev

**after this just click the link that appears something like localhost://...**
