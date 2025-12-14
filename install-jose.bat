@echo off
cd /d "%~dp0"
echo ========================================
echo Installing jose package...
echo ========================================
echo.
call npm install jose
echo.
echo ========================================
echo Installation complete!
echo ========================================
echo.
echo Press any key to close...
pause >nul

