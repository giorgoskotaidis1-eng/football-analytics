@echo off
echo ========================================
echo COMPLETE TRAINING - DOES EVERYTHING
echo ========================================
echo.
echo This will:
echo 1. Install missing packages
echo 2. Download videos (50 games - 2-4 hours)
echo 3. Process dataset (2-3 hours)
echo 4. Train model (4-8 hours)
echo.
echo Total time: 8-15 hours
echo.
echo This will create a GOOD training dataset with ~50,000 frames
echo.
pause

venv\Scripts\python.exe -m football_ai.complete_training_auto

pause

