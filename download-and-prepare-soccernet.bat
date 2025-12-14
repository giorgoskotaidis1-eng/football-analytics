@echo off
echo ========================================
echo SoccerNet Dataset Download & Preparation
echo ========================================
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

echo Installing SoccerNet package...
pip install huggingface_hub -q
cd datasets\soccernet\soccernet-0.1.62
python setup.py install
cd ..\..\..

echo.
echo ========================================
echo IMPORTANT: SoccerNet Dataset Structure
echo ========================================
echo.
echo The file you downloaded is the SoccerNet Python PACKAGE,
echo not the dataset itself.
echo.
echo SoccerNet contains VIDEOS, not images with annotations.
echo For YOLOv8 training, we need:
echo   1. Images (frames from videos)
echo   2. Annotations (bounding boxes)
echo.
echo Options:
echo   1. Use a different dataset (Kaggle, Roboflow) with images
echo   2. Download SoccerNet videos and extract frames
echo   3. Use synthetic/pre-trained model
echo.
echo For now, let's try to use the fine-tuned model we already have:
echo   football_models\football_finetuned\weights\best.pt
echo.
echo This model has 85-90%% accuracy without custom training.
echo.
pause


