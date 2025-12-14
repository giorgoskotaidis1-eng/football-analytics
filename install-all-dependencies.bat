@echo off
echo ========================================
echo Installing ALL Dependencies
echo ========================================
echo.

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Installing packages from requirements.txt...
pip install -r requirements.txt

echo.
echo Installing SoccerNet package...
pip install SoccerNet

echo.
echo Verifying installations...
echo.

python -c "import torch; print(f'PyTorch: {torch.__version__}')"
python -c "import ultralytics; print(f'Ultralytics: {ultralytics.__version__}')"
python -c "import cv2; print(f'OpenCV: {cv2.__version__}')"
python -c "import numpy; print(f'NumPy: {numpy.__version__}')"
python -c "from SoccerNet.Downloader import SoccerNetDownloader; print('SoccerNet: OK')"

echo.
echo ========================================
echo All dependencies installed!
echo ========================================
pause

