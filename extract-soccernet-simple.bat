@echo off
echo ========================================
echo SoccerNet Extraction
echo ========================================
echo.

if "%1"=="" (
    echo Usage: extract-soccernet-simple.bat ^<path-to-file^>
    echo.
    echo Example:
    echo   extract-soccernet-simple.bat C:\Users\troll\Downloads\soccernet-0.1.62.tar.gz
    echo   extract-soccernet-simple.bat .\soccernet-0.1.62.tar.gz
    echo.
    pause
    exit /b 1
)

set FILE_PATH=%1

if not exist "%FILE_PATH%" (
    echo ERROR: File not found: %FILE_PATH%
    pause
    exit /b 1
)

echo File: %FILE_PATH%
echo Extracting to: datasets\soccernet\
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

REM Extract
python -c "import tarfile; from pathlib import Path; tar = tarfile.open(r'%FILE_PATH%', 'r:gz'); tar.extractall('datasets\\soccernet'); print('Extraction complete!'); tar.close()"

if %errorlevel% EQU 0 (
    echo.
    echo Extraction successful!
    echo.
    echo Preparing dataset...
    python -m football_ai.prepare_all_datasets
    echo.
    echo Done! Run start-background-training.bat to start training
) else (
    echo.
    echo Extraction failed. Trying alternative method...
    7z x "%FILE_PATH%" -ps0cc3rn3t -odatasets\soccernet -y
)

pause


