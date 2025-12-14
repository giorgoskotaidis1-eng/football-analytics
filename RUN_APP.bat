@echo off
chcp 65001 >nul
echo ========================================
echo Football Analytics App - Startup
echo ========================================
echo.

REM Check if node_modules exists
if not exist node_modules (
    echo [1/3] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
) else (
    echo [1/3] Dependencies already installed
    echo.
)

REM Check if .env exists
if not exist .env (
    echo [2/3] WARNING: .env file not found!
    echo Creating basic .env file...
    (
    echo DATABASE_URL="file:./prisma/dev.db"
    echo JWT_SECRET="your-secret-key-change-this-in-production"
    echo RESEND_API_KEY=
    echo FROM_EMAIL=onboarding@resend.dev
    echo APP_NAME=Football Analytics
    echo APP_URL=http://localhost:3000
    ) > .env
    echo .env file created!
    echo.
) else (
    echo [2/3] .env file found
    echo.
)

echo [3/3] Starting development server...
echo.
echo ========================================
echo Server starting at: http://localhost:3000
echo ========================================
echo.
echo The browser will open automatically in a few seconds...
echo Press Ctrl+C to stop the server
echo.

REM Wait a bit then open browser
start "" cmd /c "timeout /t 5 /nobreak >nul && start http://localhost:3000"

REM Start the server
call npm run dev

