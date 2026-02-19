#!/bin/bash
# setup.sh - Run this once to install everything

echo "📦 Setting up GestureOS Environment..."

# Setup Backend
cd backend
python3.10 -m venv venv
source venv/bin/activate
pip install mediapipe==0.10.9 "protobuf<4.25.0" opencv-python scikit-learn pyautogui fastapi uvicorn websockets

cd ..

# Setup Frontend
cd frontend
npm install
echo "✅ Setup Complete! Run ./start.sh to begin."
