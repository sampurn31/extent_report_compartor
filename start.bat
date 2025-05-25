@echo off
echo Starting Test Report Analyzer...

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Node.js is not installed or not in PATH
    echo Please install Node.js 14.x or higher
    pause
    exit /b 1
)

REM Check if virtual environment exists, if not create it
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment and install dependencies
call venv\Scripts\activate
pip install -r requirements.txt

REM Install frontend dependencies if node_modules doesn't exist
if not exist frontend\node_modules (
    echo Installing frontend dependencies...
    cd frontend
    npm install
    cd ..
)

REM Start backend server in a new window
start cmd /k "call venv\Scripts\activate && python app.py"

REM Start frontend server in a new window
start cmd /k "cd frontend && npm start"

echo Servers are starting...
echo Frontend will be available at: http://localhost:3000
echo Backend will be available at: http://localhost:5000
echo.
echo You can close both servers by closing their respective command windows
pause 