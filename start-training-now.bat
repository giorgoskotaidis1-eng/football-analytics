@echo off
echo ========================================
echo Starting Training NOW
echo ========================================
echo.

cd /d "%~dp0"

echo Activating venv and starting training...
call venv\Scripts\activate.bat

echo.
echo Running training script...
python -m football_ai.fix_and_train

echo.
echo ========================================
echo Training script finished
echo ========================================
pause

