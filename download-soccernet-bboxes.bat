@echo off
echo ========================================
echo Download SoccerNet Player Bounding Boxes
echo ========================================
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

echo This will download player bounding boxes from SoccerNet
echo These are perfect for YOLOv8 training!
echo.

python -m football_ai.download_soccernet_bboxes --download

if %errorlevel% EQU 0 (
    echo.
    echo ========================================
    echo Download Complete!
    echo ========================================
    echo.
    echo Next steps:
    echo   1. Download videos (optional, for extracting frames)
    echo   2. Process bounding boxes: python -m football_ai.download_soccernet_bboxes --process
    echo   3. Start training: start-background-training.bat
    echo.
) else (
    echo.
    echo Download failed. Check errors above.
    echo.
)

pause


