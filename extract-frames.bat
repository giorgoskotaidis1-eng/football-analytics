@echo off
echo Extracting frames from videos for annotation...
echo.

if "%1"=="" (
    echo Usage: extract-frames.bat ^<video_file^> [output_dir] [interval_seconds]
    echo Example: extract-frames.bat match.mp4 frames 5
    pause
    exit /b 1
)

set VIDEO_FILE=%1
set OUTPUT_DIR=%2
if "%OUTPUT_DIR"=="" set OUTPUT_DIR=frames
set INTERVAL=%3
if "%INTERVAL"=="" set INTERVAL=5

echo Video: %VIDEO_FILE%
echo Output: %OUTPUT_DIR%
echo Interval: %INTERVAL% seconds
echo.

REM Activate virtual environment if exists
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

python -m football_ai.extract_frames %VIDEO_FILE% %OUTPUT_DIR% %INTERVAL%

echo.
echo Frames extracted! Now annotate with LabelImg:
echo 1. Install: pip install labelImg
echo 2. Run: labelImg
echo 3. Open %OUTPUT_DIR% directory
echo 4. Annotate players and ball
echo 5. Save as YOLOv8 format
echo.
pause


