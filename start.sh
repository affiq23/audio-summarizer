#!/bin/bash

# start backend
echo "Starting backend..."
source venv/bin/activate
cd backend && python -m uvicorn main:app --reload &
BACKEND_PID=$!
cd ..

# start frontend
echo "Starting frontend..."
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Backend:  http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both"

# shut both down on Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait