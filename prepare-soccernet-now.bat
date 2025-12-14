@echo off
echo ========================================
echo SoccerNet Preparation
echo ========================================
echo.

REM Activate virtual environment
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
)

echo Please provide the full path to soccernet-0.1.62.tar.gz
echo Or place it in the current directory
echo.
set /p FILE_PATH="Enter file path (or press Enter to search): "

if "%FILE_PATH%"=="" (
    echo Searching for file...
    python -c "from pathlib import Path; import sys; files = list(Path('.').rglob('*soccernet*.tar.gz')); print(files[0] if files else 'Not found', file=sys.stderr)"
    python -m football_ai.find_and_prepare_soccernet
) else (
    if exist "%FILE_PATH%" (
        echo Using file: %FILE_PATH%
        python -c "from pathlib import Path; from football_ai.find_and_prepare_soccernet import extract_soccernet, prepare_soccernet_auto; import sys; sys.path.insert(0, '.'); file = Path('%FILE_PATH%'); extract_soccernet(file, Path('datasets/soccernet'), 's0cc3rn3t')"
        python -m football_ai.prepare_all_datasets
    ) else (
        echo File not found: %FILE_PATH%
        pause
        exit /b 1
    )
)

echo.
echo If extraction succeeded, dataset should be ready!
echo Next: start-background-training.bat
pause


