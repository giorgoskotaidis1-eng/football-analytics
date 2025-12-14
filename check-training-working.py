"""Check if training is working correctly"""
import sys
import subprocess
from pathlib import Path
import os

print("=" * 60)
print("TRAINING STATUS CHECK")
print("=" * 60)
print()

# 1. Check Python processes
print("[1] Checking Python processes...")
try:
    result = subprocess.run(
        ["tasklist", "/FI", "IMAGENAME eq python.exe"],
        capture_output=True,
        text=True,
        timeout=5
    )
    python_count = result.stdout.count("python.exe")
    if python_count > 0:
        print(f"   ✅ {python_count} Python process(es) running")
    else:
        print("   ❌ No Python processes found")
except:
    print("   ⚠️ Could not check processes")

print()

# 2. Check log file
print("[2] Checking log file...")
log_file = Path("training-output.log")
if log_file.exists():
    with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
        lines = f.readlines()
        print(f"   ✅ Log file exists ({len(lines)} lines)")
        print("   Last 5 lines:")
        for line in lines[-5:]:
            print(f"      {line.strip()}")
else:
    print("   ❌ Log file not found")

print()

# 3. Check SoccerNet videos
print("[3] Checking SoccerNet videos...")
soccernet_path = Path("datasets/soccernet_data")
if soccernet_path.exists():
    videos = list(soccernet_path.rglob("*.mkv")) + list(soccernet_path.rglob("*.mp4"))
    print(f"   ✅ Found {len(videos)} videos in SoccerNet folder")
    if videos:
        game_dirs = set(v.parent for v in videos)
        print(f"   ✅ {len(game_dirs)} different games")
else:
    print("   ❌ SoccerNet folder not found")

print()

# 4. Check extracted frames
print("[4] Checking extracted frames...")
train_path = Path("datasets/football_yolo/images/train")
if train_path.exists():
    images = list(train_path.glob("*.jpg"))
    print(f"   ✅ Found {len(images)} training images")
    if images > 0:
        print("   ✅ Training dataset is being created!")
else:
    print("   ⚠️ No training images yet (may still be processing)")

val_path = Path("datasets/football_yolo/images/val")
if val_path.exists():
    val_images = list(val_path.glob("*.jpg"))
    print(f"   ✅ Found {len(val_images)} validation images")

print()

# 5. Check model files
print("[5] Checking model files...")
model_path = Path("football_models/football_soccernet/weights")
if model_path.exists():
    models = list(model_path.glob("*.pt"))
    if models:
        print(f"   ✅ Found {len(models)} model file(s):")
        for model in models:
            size_mb = model.stat().st_size / (1024 * 1024)
            print(f"      - {model.name} ({size_mb:.1f} MB)")
    else:
        print("   ⚠️ No model files yet (training not started)")
else:
    print("   ⚠️ Model directory not created yet")

print()

# 6. Summary
print("=" * 60)
print("SUMMARY")
print("=" * 60)

if log_file.exists():
    with open(log_file, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()
        if "Processing" in content or "Extract" in content:
            print("✅ Training is WORKING - Processing videos!")
        elif "Error" in content or "Failed" in content:
            print("❌ Training has ERRORS - Check log file!")
        elif "Download" in content:
            print("⏳ Training is DOWNLOADING videos...")
        else:
            print("⏳ Training is starting...")

print()
print("Check training-output.log for detailed progress")
print("=" * 60)

