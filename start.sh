#!/bin/bash
# 1. FORCE the terminal to go to the folder where this script is saved
cd "$(dirname "$0")"

echo "🚀 Launching GestureOS..."

# 2. Activate the Virtual Environment (Fixes 'No module named uvicorn')
# We check the root folder first (as seen in your screenshot)
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "backend/venv/bin/activate" ]; then
    source backend/venv/bin/activate
else
    echo "❌ Error: Could not find your 'venv' folder. Did you run setup.sh?"
    exit 1
fi

# 3. Start Backend
if [ -d "backend" ]; then
    cd backend
    # Running uvicorn in the background
    python -m uvicorn main:app --reload &
    BACKEND_PID=$!
    cd ..
else
    echo "❌ Error: 'backend' folder missing."
    exit 1
fi

# 4. Start Frontend
if [ -d "frontend" ]; then
    cd frontend
    npm run dev -- --open &
    FRONTEND_PID=$!
    cd ..
else
    echo "❌ Error: 'frontend' folder missing."
    kill $BACKEND_PID
    exit 1
fi

# 5. Cleanup Function (Runs when you press Ctrl+C)
cleanup() {
    echo -e "\n🛑 Stopping GestureOS..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT
wait