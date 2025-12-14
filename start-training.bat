@echo off
echo ========================================
echo Starting Custom YOLOv8 Training
echo ========================================
echo.

REM Check Python
python --version >NUL 2>&1
if %errorlevel% NEQ 0 (
    echo ERROR: Python not found!
    pause
    exit /b 1
)

REM Check virtual environment
if not exist "venv" (
    echo Virtual environment not found. Creating...
    python -m venv venv
    if %errorlevel% NEQ 0 (
        echo Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if dependencies are installed
python -c "import ultralytics" >NUL 2>&1
if %errorlevel% NEQ 0 (
    echo Installing Python dependencies...
    pip install -r requirements.txt
    if %errorlevel% NEQ 0 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check for dataset
if not exist "datasets\football_yolo" (
    echo.
    echo ========================================
    echo WARNING: Dataset not found!
    echo ========================================
    echo.
    echo You need a dataset to train the model.
    echo.
    echo Option 1: Use SoccerNet (Recommended)
    echo   1. Download from: https://www.soccer-net.org/
    echo   2. Run: python -m football_ai.prepare_dataset --coco <path> --images <path> --output datasets\football_yolo --split
    echo.
    echo Option 2: Annotate your own videos
    echo   1. Extract frames: extract-frames.bat match.mp4 frames 5
    echo   2. Annotate with LabelImg: pip install labelImg && labelImg
    echo   3. Organize into train/val/test folders
    echo.
    echo See DATASET_PREPARATION.md for details
    echo.
    echo ========================================
    echo.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "%CONTINUE%"=="y" (
        echo Training cancelled.
        pause
        exit /b 1
    )
)

REM Check for GPU
echo.
echo Checking for GPU...
python -c "import torch; print('CUDA available:', torch.cuda.is_available()); print('GPU count:', torch.cuda.device_count() if torch.cuda.is_available() else 0)" 2>NUL
if %errorlevel% NEQ 0 (
    echo Warning: Could not check GPU status
)

echo.
echo ========================================
echo Starting Training...
echo ========================================
echo.
echo This will take 4-8 hours (GPU) or 1-2 days (CPU)
echo You can monitor progress in: football_models\football_custom\
echo.
echo Press Ctrl+C to stop training
echo.

REM Start training
python -m football_ai.train ^
  --dataset datasets\football_yolo ^
  --base-model yolov8s.pt ^
  --epochs 100 ^
  --batch 16 ^
  --device 0 ^
  --name football_custom

if %errorlevel% EQU 0 (
    echo.
    echo ========================================
    echo Training Complete!
    echo ========================================
    echo.
    echo Best model: football_models\football_custom\weights\best.pt
    echo.
    echo To use the trained model, update football_ai/analysis.py:
    echo   self.model = YOLO("football_models/football_custom/weights/best.pt")
    echo.
) else (
    echo.
    echo ========================================
    echo Training Failed!
    echo ========================================
    echo.
    echo Check the error messages above
    echo.
)

pause


