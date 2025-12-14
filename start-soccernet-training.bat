@echo off
echo ========================================
echo SoccerNet Training Pipeline
echo ========================================
echo.

echo This will:
echo 1. Download SoccerNet videos (if needed)
echo 2. Extract frames and match with bounding boxes
echo 3. Convert to YOLOv8 format
echo 4. Train the model
echo.

pause

echo.
echo Starting training pipeline...
echo.

python -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000

echo.
echo ========================================
echo Training pipeline complete!
echo ========================================
pause

