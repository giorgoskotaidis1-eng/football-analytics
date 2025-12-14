"""
Check training status and progress
"""

import sys
from pathlib import Path

def check_training_status():
    """Check if training is running or completed"""
    print("=" * 60)
    print("Training Status Check")
    print("=" * 60)
    print()
    
    # Check for trained models
    model_paths = [
        "football_models/football_soccernet/weights/best.pt",
        "football_models/football_soccernet/weights/last.pt",
        "football_models/football_finetuned/weights/best.pt",
        "football_models/football_auto/weights/best.pt",
    ]
    
    found_models = []
    for path_str in model_paths:
        path = Path(path_str)
        if path.exists():
            size_mb = path.stat().st_size / (1024 * 1024)
            found_models.append((path_str, size_mb))
            print(f"✅ Found: {path_str}")
            print(f"   Size: {size_mb:.2f} MB")
            print()
    
    # Check for dataset
    dataset_paths = [
        "datasets/football_yolo/images/train",
        "datasets/football_yolo/images/val",
        "datasets/football_yolo/labels/train",
    ]
    
    dataset_ready = all(Path(p).exists() for p in dataset_paths)
    
    if dataset_ready:
        # Count images
        train_images = len(list(Path("datasets/football_yolo/images/train").glob("*.jpg")))
        val_images = len(list(Path("datasets/football_yolo/images/val").glob("*.jpg")))
        print(f"✅ Dataset ready:")
        print(f"   Train images: {train_images}")
        print(f"   Val images: {val_images}")
        print()
    
    # Check for videos
    video_count = len(list(Path("datasets/soccernet_data").rglob("*.mkv")))
    if video_count > 0:
        print(f"✅ Videos found: {video_count}")
        print()
    
    # Summary
    print("=" * 60)
    if found_models:
        print(f"✅ Training Complete! Found {len(found_models)} model(s)")
        print("   The AI is ready to use!")
    elif dataset_ready:
        print("⏳ Dataset ready, training in progress or not started")
        print("   Run: python -m football_ai.train --dataset datasets/football_yolo")
    elif video_count > 0:
        print("⏳ Videos found, processing dataset...")
        print("   Run: python -m football_ai.prepare_soccernet_training --process")
    else:
        print("⏳ Starting from scratch...")
        print("   Run: python -m football_ai.prepare_soccernet_training --all")
    print("=" * 60)

if __name__ == "__main__":
    check_training_status()

