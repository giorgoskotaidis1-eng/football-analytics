@echo off
echo ========================================
echo SoccerNet Dataset Extraction
echo ========================================
echo.

REM Find SoccerNet file
echo Searching for SoccerNet file...
for %%f in (soccernet-*.zip soccernet-*.tar soccernet-*.tar.gz soccernet-*.7z) do (
    echo Found: %%f
    set SOCCERNET_FILE=%%f
    goto :extract
)

echo.
echo ERROR: SoccerNet file not found!
echo.
echo Please ensure the file is named:
echo   - soccernet-*.zip
echo   - soccernet-*.tar
echo   - soccernet-*.tar.gz
echo   - soccernet-*.7z
echo.
echo And is in the current directory or datasets folder
echo.
pause
exit /b 1

:extract
echo.
echo Extracting SoccerNet dataset...
echo File: %SOCCERNET_FILE%
echo.

REM Create datasets directory
if not exist "datasets" mkdir datasets
if not exist "datasets\soccernet" mkdir datasets\soccernet

REM Extract based on file type (with password: s0cc3rn3t)
if "%SOCCERNET_FILE:~-4%"==".zip" (
    echo Extracting ZIP file with password...
    python -c "import zipfile; z=zipfile.ZipFile('%SOCCERNET_FILE%'); z.setpassword(b's0cc3rn3t'); z.extractall('datasets\\soccernet')"
    if %errorlevel% NEQ 0 (
        echo Trying without password...
        powershell -command "Expand-Archive -Path '%SOCCERNET_FILE%' -DestinationPath 'datasets\soccernet' -Force"
    )
) else if "%SOCCERNET_FILE:~-4%"==".tar" (
    echo Extracting TAR file...
    tar -xf "%SOCCERNET_FILE%" -C datasets\soccernet
) else if "%SOCCERNET_FILE:~-7%"==".tar.gz" (
    echo Extracting TAR.GZ file...
    tar -xzf "%SOCCERNET_FILE%" -C datasets\soccernet
) else if "%SOCCERNET_FILE:~-3%"==".7z" (
    echo Extracting 7Z file with password...
    7z x "%SOCCERNET_FILE%" -ps0cc3rn3t -odatasets\soccernet -y
    if %errorlevel% NEQ 0 (
        echo Trying without password...
        7z x "%SOCCERNET_FILE%" -odatasets\soccernet -y
    )
) else (
    echo Unknown file type. Using Python extractor with password...
    python -m football_ai.find_and_prepare_soccernet
    if %errorlevel% NEQ 0 (
        echo Please extract manually to: datasets\soccernet\
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo Extraction Complete!
echo ========================================
echo.
echo Dataset extracted to: datasets\soccernet\
echo.
echo Next: Run COMPLETE_AUTO_SETUP.bat to prepare and train
echo.
pause

