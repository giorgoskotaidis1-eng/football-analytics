@echo off
echo ========================================
echo SoccerNet Extraction & Preparation
echo ========================================
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

echo Please provide the path to soccernet-0.1.62.tar.gz
echo.
echo Examples:
echo   C:\Users\troll\Downloads\soccernet-0.1.62.tar.gz
echo   .\soccernet-0.1.62.tar.gz
echo   datasets\soccernet-0.1.62.tar.gz
echo.
set /p FILE_PATH="Enter full path to soccernet-0.1.62.tar.gz: "

if "%FILE_PATH%"=="" (
    echo No path provided!
    pause
    exit /b 1
)

REM Check if file exists
if not exist "%FILE_PATH%" (
    echo.
    echo ERROR: File not found: %FILE_PATH%
    echo.
    echo Please check the path and try again
    pause
    exit /b 1
)

echo.
echo File found: %FILE_PATH%
echo.
echo Extracting to: datasets\soccernet\
echo.

REM Extract using Python
python -c "import tarfile; from pathlib import Path; import sys; tar = tarfile.open(r'%FILE_PATH%', 'r:gz'); tar.extractall('datasets\\soccernet'); print('Extraction complete!', file=sys.stderr); tar.close()"

if %errorlevel% NEQ 0 (
    echo.
    echo Extraction failed! Trying with 7z...
    7z x "%FILE_PATH%" -ps0cc3rn3t -odatasets\soccernet -y
)

echo.
echo ========================================
echo Preparing Dataset for Training
echo ========================================
echo.

python -m football_ai.prepare_all_datasets

if %errorlevel% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS!
    echo ========================================
    echo.
    echo Dataset is ready for training!
    echo.
    echo Next step: Run start-background-training.bat
    echo.
) else (
    echo.
    echo Preparation had some issues, but extraction should be complete.
    echo Check: datasets\soccernet\
    echo.
)

pause


