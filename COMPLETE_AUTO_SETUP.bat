@echo off
echo ========================================
echo Complete Automatic Dataset Setup
echo ========================================
echo.
echo This script will:
echo   1. Try to download from all sources
echo   2. Prepare any found datasets
echo   3. Start training automatically
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
)

REM Install dependencies
echo.
echo Installing Python dependencies...
pip install -r requirements.txt -q

REM Step 1: Try to download datasets
echo.
echo ========================================
echo Step 1: Downloading Datasets
echo ========================================
python -m football_ai.download_all_sources

REM Step 2: Prepare datasets
echo.
echo ========================================
echo Step 2: Preparing Datasets
echo ========================================
python -m football_ai.prepare_all_datasets

REM Step 3: Check if dataset is ready
echo.
echo ========================================
echo Step 3: Checking Dataset
echo ========================================
if exist "datasets\football_yolo\images\train" (
    echo Dataset found! Starting training...
    echo.
    start-background-training.bat
) else (
    echo.
    echo ========================================
    echo Dataset Not Ready
    echo ========================================
    echo.
    echo Please download a dataset manually:
    echo.
    echo Option 1: SoccerNet (Recommended)
    echo   1. Visit: https://www.soccer-net.org/
    echo   2. Register (free)
    echo   3. Download SoccerNet-v2
    echo   4. Extract to: datasets\soccernet\
    echo   5. Run this script again
    echo.
    echo Option 2: Kaggle
    echo   1. Visit: https://www.kaggle.com/datasets
    echo   2. Search: "football player detection"
    echo   3. Download dataset
    echo   4. Extract to: datasets\kaggle\
    echo   5. Run this script again
    echo.
    echo Option 3: Roboflow
    echo   1. Visit: https://roboflow.com/datasets
    echo   2. Search: "soccer"
    echo   3. Download as YOLOv8 format
    echo   4. Extract to: datasets\roboflow\
    echo   5. Run this script again
    echo.
)

pause


