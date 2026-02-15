cd "$(dirname "$0")"

echo "🚀 Launching GestureOS..."


if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
elif [ -f "backend/venv/bin/activate" ]; then
    source backend/venv/bin/activate
else
    echo "❌ Error: Could not find your 'venv' folder. Did you run setup.sh?"
    exit 1
fi

if [ -d "backend" ]; then
    cd backend

    python -m uvicorn main:app --reload &
    BACKEND_PID=$!
    cd ..
else
    echo "❌ Error: 'backend' folder missing."
    exit 1
fi


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


cleanup() {
    echo -e "\n🛑 Stopping GestureOS..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT
wait