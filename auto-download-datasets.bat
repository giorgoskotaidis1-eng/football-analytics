@echo off
echo ========================================
echo Automatic Dataset Download & Preparation
echo ========================================
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

echo This script will attempt to download public football datasets
echo from multiple sources and prepare them for training.
echo.
echo Sources:
echo   - SoccerNet (requires manual download)
echo   - Kaggle datasets
echo   - Roboflow (if available)
echo.

REM Install required packages
echo Installing required packages...
pip install requests kaggle >NUL 2>&1

REM Run auto-download
python -m football_ai.download_datasets --auto

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo.
echo If datasets were downloaded:
echo   1. Review downloaded datasets
echo   2. Run: start-background-training.bat
echo.
echo If no datasets found:
echo   1. Download SoccerNet manually: https://www.soccer-net.org/
echo   2. Or use Kaggle: https://www.kaggle.com/datasets
echo   3. Then run this script again
echo.
pause


