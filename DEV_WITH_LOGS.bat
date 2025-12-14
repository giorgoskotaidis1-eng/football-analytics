@echo off
echo ========================================
echo Starting Dev Server with VERBOSE LOGGING
echo ========================================
echo.
echo This will show detailed logs to see where it hangs
echo.

cd /d "%~dp0"

echo [1/3] Clearing .next cache...
if exist .next (
    rmdir /s /q .next
    echo ✅ Cache cleared
) else (
    echo .next folder does not exist
)

echo.
echo [2/3] Setting environment variables for verbose logging...
set NODE_OPTIONS=--trace-warnings
set NEXT_DEBUG=1

echo.
echo [3/3] Starting server with logs...
echo.
echo ========================================
echo WATCH FOR WHERE IT HANGS
echo ========================================
echo.

npm run dev

pause
