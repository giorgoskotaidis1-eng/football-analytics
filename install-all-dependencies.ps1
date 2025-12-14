# PowerShell script to install all dependencies
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Installing ALL Dependencies" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Installing packages from requirements.txt..." -ForegroundColor Yellow
& "venv\Scripts\python.exe" -m pip install -r requirements.txt

Write-Host ""
Write-Host "Installing SoccerNet package..." -ForegroundColor Yellow
& "venv\Scripts\python.exe" -m pip install SoccerNet

Write-Host ""
Write-Host "Verifying installations..." -ForegroundColor Yellow
Write-Host ""

& "venv\Scripts\python.exe" -c "import torch; print(f'PyTorch: {torch.__version__}')"
& "venv\Scripts\python.exe" -c "import ultralytics; print(f'Ultralytics: {ultralytics.__version__}')"
& "venv\Scripts\python.exe" -c "import cv2; print(f'OpenCV: {cv2.__version__}')"
& "venv\Scripts\python.exe" -c "import numpy; print(f'NumPy: {numpy.__version__}')"
& "venv\Scripts\python.exe" -c "from SoccerNet.Downloader import SoccerNetDownloader; print('SoccerNet: OK')"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All dependencies installed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

