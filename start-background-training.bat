@echo off
echo ========================================
echo Starting Background Training
echo ========================================
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Check GPU
python -c "import torch; print('GPU:', 'Yes' if torch.cuda.is_available() else 'No (CPU)')"

echo.
echo Starting training in background...
echo Training will continue even if you close this window
echo.
echo Monitor progress:
echo   - Check: football_models\football_auto\
echo   - Logs: training.log
echo.

REM Start training in background and log output
start /B python -m football_ai.auto_train > training.log 2>&1

echo Training started!
echo Process ID saved to training.pid
echo.
echo To stop training:
echo   taskkill /F /IM python.exe
echo.
echo To monitor progress:
echo   type training.log
echo.
pause


