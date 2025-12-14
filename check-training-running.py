"""Check if training is actually running"""
import sys
import subprocess
from pathlib import Path

print("=" * 60)
print("Checking Training Status")
print("=" * 60)
print()

# Check Python processes
try:
    result = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq python.exe"],
        capture_output=True,
        text=True
    )
    python_processes = result.stdout.count("python.exe")
    print(f"Python processes running: {python_processes}")
    
    if python_processes > 0:
        print("✅ Training process is running!")
    else:
        print("❌ No training process found!")
except:
    print("⚠️ Could not check processes")

print()

# Check for output files
dataset_path = Path("datasets/football_yolo/images/train")
if dataset_path.exists():
    images = list(dataset_path.glob("*.jpg"))
    print(f"Training images found: {len(images)}")
else:
    print("No training images directory found")

print()

# Check for model files
model_path = Path("football_models/football_soccernet/weights")
if model_path.exists():
    models = list(model_path.glob("*.pt"))
    print(f"Model files found: {len(models)}")
    for model in models:
        print(f"  - {model.name}")
else:
    print("No model directory found")

print()
print("=" * 60)

