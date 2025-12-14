@echo off
echo ========================================
echo Starting Complete Training Pipeline
echo ========================================
echo.
echo This will:
echo 1. Download videos (1-3 hours)
echo 2. Process dataset (1-2 hours)
echo 3. Train model (4-8 hours)
echo.
echo Total time: 6-12 hours
echo.
pause

echo.
echo Starting training...
echo.

venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000

echo.
echo ========================================
echo Training complete!
echo ========================================
pause

