@echo off
echo ========================================
echo Starting Football Analytics Server
echo ========================================
echo.
echo Server will be accessible from iPad at:
echo http://[YOUR_LOCAL_IP]:3000
echo.
echo Make sure your iPad is on the same WiFi!
echo.
echo ========================================
echo.

cd /d "%~dp0"
npm run dev

pause


