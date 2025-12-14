@echo off
echo ========================================
echo Checking for existing videos...
echo ========================================
echo.

dir /s /b datasets\soccernet_data\*.mkv 2>nul
dir /s /b datasets\soccernet_data\*.mp4 2>nul

echo.
echo ========================================
echo Search complete!
echo ========================================
pause

