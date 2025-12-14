@echo off
echo ========================================
echo Installing SoccerNet Package
echo ========================================
echo.

echo Step 1: Installing SoccerNet...
venv\Scripts\python.exe -m pip install SoccerNet

echo.
echo Step 2: Verifying installation...
venv\Scripts\python.exe -c "from SoccerNet.Downloader import SoccerNetDownloader; print('SoccerNet: OK')"

echo.
echo ========================================
echo Installation complete!
echo ========================================
pause

