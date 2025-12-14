@echo off
echo ========================================
echo Training Custom YOLOv8 Model
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "venv" (
    echo ERROR: Virtual environment not found!
    echo Please run setup-python-ai.bat first
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if dataset exists
if not exist "datasets\football_yolo" (
    echo.
    echo WARNING: Dataset not found at datasets\football_yolo
    echo.
    echo Please prepare your dataset first:
    echo 1. Annotate videos with LabelImg or CVAT
    echo 2. Convert to YOLOv8 format
    echo 3. Place in datasets\football_yolo\
    echo.
    echo See TRAINING_GUIDE.md for details
    echo.
    pause
    exit /b 1
)

echo.
echo Starting training...
echo Dataset: datasets\football_yolo
echo Base model: yolov8s.pt
echo Epochs: 100
echo.
echo This will take 4-8 hours depending on your GPU...
echo.

python -m football_ai.train ^
  --dataset datasets\football_yolo ^
  --base-model yolov8s.pt ^
  --epochs 100 ^
  --batch 16 ^
  --device 0 ^
  --name football_custom

echo.
echo ========================================
echo Training complete!
echo ========================================
echo.
echo Best model saved to:
echo football_models\football_custom\weights\best.pt
echo.
echo To use the trained model, update football_ai/analysis.py:
echo self.model = YOLO("football_models/football_custom/weights/best.pt")
echo.
pause


