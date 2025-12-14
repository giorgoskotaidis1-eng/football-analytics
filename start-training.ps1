# PowerShell script to start training
# Run with: .\start-training.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting SoccerNet Training" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& "venv\Scripts\python.exe" --version

Write-Host ""
Write-Host "Starting training pipeline..." -ForegroundColor Yellow
Write-Host "This will take 6-12 hours" -ForegroundColor Yellow
Write-Host ""
Write-Host "Progress will be saved to:" -ForegroundColor Yellow
Write-Host "  - datasets/football_yolo/ (dataset)" -ForegroundColor Gray
Write-Host "  - football_models/football_soccernet/ (trained model)" -ForegroundColor Gray
Write-Host ""

# Start training
& "venv\Scripts\python.exe" -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Training complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

