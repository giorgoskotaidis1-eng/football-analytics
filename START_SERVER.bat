@echo off
echo ========================================
echo Starting Football Analytics App
echo ========================================
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Check if .env exists
if not exist .env (
    echo WARNING: .env file not found!
    echo Run UPDATE_ENV_EMAIL.bat first to create it.
    echo.
)

echo Starting development server...
echo.
echo Server will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the server
call npm run dev

