@echo off
echo ========================================
echo Comprehensive Dataset Download
echo ========================================
echo.
echo This will attempt to download datasets from:
echo   - Kaggle (if configured)
echo   - SoccerNet (if downloaded)
echo   - Roboflow (if available)
echo   - Other public sources
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Install required packages
echo Installing required packages...
pip install requests pillow numpy kaggle >NUL 2>&1

REM Run comprehensive download
python -m football_ai.download_all_sources

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo If datasets were downloaded:
echo   1. Prepare: python -m football_ai.prepare_all_datasets
echo   2. Train: start-background-training.bat
echo.
echo If no datasets found:
echo   1. Download SoccerNet: https://www.soccer-net.org/
echo   2. Or Kaggle: https://www.kaggle.com/datasets
echo   3. Then run this script again
echo.
pause


