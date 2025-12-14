"""
Orchestration script to run the complete AI pipeline.

This script runs all training steps in order:
1. Vision pipeline (download, convert, train)
2. Events preparation (if CSVs exist)
3. Analytics models training (if datasets exist)
"""

import os
import sys
import subprocess
from pathlib import Path

def run_command(cmd, description):
    """Run a command and handle errors."""
    print("\n" + "=" * 60)
    print(description)
    print("=" * 60)
    print(f"Running: {' '.join(cmd)}")
    print()
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=False)
        print(f"✅ {description} - SUCCESS")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} - FAILED")
        print(f"Error: {e}")
        return False
    except FileNotFoundError:
        print(f"❌ Command not found: {cmd[0]}")
        print("Make sure Python and required packages are installed.")
        return False


def check_files_exist(paths, description):
    """Check if files/directories exist."""
    missing = []
    for path in paths:
        if not Path(path).exists():
            missing.append(path)
    
    if missing:
        print(f"⚠ {description} - Missing files:")
        for p in missing:
            print(f"  - {p}")
        return False
    return True


def main():
    print("=" * 60)
    print("AI Pipeline - Complete Training Orchestration")
    print("=" * 60)
    print()
    
    # Change to project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    os.chdir(project_root)
    
    print(f"Working directory: {os.getcwd()}")
    print()
    
    # Step 1: Vision Pipeline
    print("=" * 60)
    print("STEP 1: Vision Pipeline (YOLO Training)")
    print("=" * 60)
    
    vision_scripts = [
        ("ai_pipeline/vision/download_soccernet.py", "Download SoccerNet data"),
        ("ai_pipeline/vision/soccernet_to_yolo_all.py", "Convert to YOLOv8 format"),
        ("ai_pipeline/vision/train_yolo_soccernet.py", "Train YOLOv8 model"),
    ]
    
    for script, desc in vision_scripts:
        if not run_command([sys.executable, script], desc):
            print(f"\n⚠ Warning: {desc} failed. Continuing anyway...")
            response = input("Continue? (y/n): ")
            if response.lower() != 'y':
                return
    
    # Step 2: Events Preparation (optional)
    print("\n" + "=" * 60)
    print("STEP 2: Events Dataset Preparation (Optional)")
    print("=" * 60)
    
    events_dir = Path("data/events")
    if events_dir.exists() and any(events_dir.glob("*.csv")):
        print("Found event CSV files. Preparing datasets...")
        
        events_scripts = [
            ("ai_pipeline/events/prepare_shot_dataset.py", "Prepare shot dataset"),
            ("ai_pipeline/events/prepare_pass_dataset.py", "Prepare pass dataset"),
        ]
        
        for script, desc in events_scripts:
            if not run_command([sys.executable, script], desc):
                print(f"\n⚠ Warning: {desc} failed. Skipping analytics models...")
                break
    else:
        print("⚠ No event CSV files found in data/events/")
        print("  Skipping events preparation and analytics models.")
        print("  Export events from your app to data/events/*.csv to enable this step.")
    
    # Step 3: Analytics Models (optional)
    print("\n" + "=" * 60)
    print("STEP 3: Analytics Models Training (Optional)")
    print("=" * 60)
    
    shot_train = Path("data/processed/shots_train.parquet")
    pass_train = Path("data/processed/passes_train.parquet")
    
    if shot_train.exists():
        print("Found shot dataset. Training xG model...")
        run_command([sys.executable, "ai_pipeline/models/train_xg_shots.py"], "Train xG model")
    else:
        print("⚠ Shot dataset not found. Skipping xG model training.")
    
    if pass_train.exists():
        print("Found pass dataset. Training pass value model...")
        run_command([sys.executable, "ai_pipeline/models/train_pass_value.py"], "Train pass value model")
    else:
        print("⚠ Pass dataset not found. Skipping pass value model training.")
    
    # Summary
    print("\n" + "=" * 60)
    print("Pipeline Execution Complete!")
    print("=" * 60)
    print()
    print("Next steps:")
    print("1. Check model outputs:")
    print("   - Vision: runs/detect/soccernet_players_all/weights/best.pt")
    print("   - xG: ai_pipeline/models/xg_shots_model.pkl")
    print("   - Pass value: ai_pipeline/models/pass_value_model.pkl")
    print()
    print("2. Use runtime functions in your backend:")
    print("   from ai_pipeline.runtime.xg_runtime import predict_shot_xg, predict_pass_value")
    print()
    print("3. See README.md for detailed usage instructions.")
    print("=" * 60)


if __name__ == "__main__":
    main()

