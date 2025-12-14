@echo off
echo ========================================
echo Starting SoccerNet Training
echo ========================================
echo.

echo Checking Python...
venv\Scripts\python.exe --version
echo.

echo Starting training pipeline...
echo This will take 6-12 hours
echo.
echo Progress will be saved to:
echo   - datasets/football_yolo/ (dataset)
echo   - football_models/football_soccernet/ (trained model)
echo.

REM Start training directly with venv python
venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000

echo.
echo ========================================
echo Training complete!
echo ========================================
pause

