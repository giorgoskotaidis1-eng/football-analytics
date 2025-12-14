@echo off
echo Searching for soccernet-0.1.62.tar.gz...
echo.

REM Search in current directory
if exist "soccernet-0.1.62.tar.gz" (
    echo Found in current directory: soccernet-0.1.62.tar.gz
    set SOCCERNET_FILE=soccernet-0.1.62.tar.gz
    goto :found
)

REM Search in datasets folder
if exist "datasets\soccernet-0.1.62.tar.gz" (
    echo Found in datasets folder: datasets\soccernet-0.1.62.tar.gz
    set SOCCERNET_FILE=datasets\soccernet-0.1.62.tar.gz
    goto :found
)

REM Search for any soccernet file
for /r %%f in (soccernet-*.tar.gz) do (
    echo Found: %%f
    set SOCCERNET_FILE=%%f
    goto :found
)

echo.
echo File not found!
echo.
echo Please:
echo   1. Ensure the file is named: soccernet-0.1.62.tar.gz
echo   2. Place it in the current directory or datasets folder
echo   3. Run this script again
echo.
pause
exit /b 1

:found
echo.
echo File found: %SOCCERNET_FILE%
echo.
echo Extracting with Python...
python -m football_ai.find_and_prepare_soccernet
pause


