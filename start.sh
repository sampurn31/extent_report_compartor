#!/bin/bash

echo "Starting Test Report Analyzer..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python is not installed or not in PATH"
    echo "Please install Python 3.8 or higher"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed or not in PATH"
    echo "Please install Node.js 14.x or higher"
    exit 1
fi

# Check if virtual environment exists, if not create it
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install -r requirements.txt

# Install frontend dependencies if node_modules doesn't exist
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend
    npm install
    cd ..
fi

# Function to cleanup background processes on script exit
cleanup() {
    echo "Stopping servers..."
    kill $(jobs -p) 2>/dev/null
}

# Set up cleanup on script exit
trap cleanup EXIT

# Start backend server in background
source venv/bin/activate && python app.py &
backend_pid=$!

# Wait a bit for backend to start
sleep 2

# Start frontend server in background
cd frontend && npm start &
frontend_pid=$!

echo "Servers are starting..."
echo "Frontend will be available at: http://localhost:3000"
echo "Backend will be available at: http://localhost:5000"
echo
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $backend_pid $frontend_pid 