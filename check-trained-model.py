"""
Check if trained models exist and display their status
"""

from pathlib import Path
import sys

def check_trained_models():
    """Check for trained models in football_models directory"""
    print("=" * 60)
    print("Checking for Trained Models")
    print("=" * 60)
    print()
    
    possible_paths = [
        ("football_models/football_finetuned/weights/best.pt", "Fine-tuned (best)"),
        ("football_models/football_finetuned/weights/last.pt", "Fine-tuned (last)"),
        ("football_models/football_auto/weights/best.pt", "Auto-trained (best)"),
        ("football_models/football_auto/weights/last.pt", "Auto-trained (last)"),
        ("football_models/football_yolov8s/weights/best.pt", "Custom trained (best)"),
        ("football_models/football_yolov8s/weights/last.pt", "Custom trained (last)"),
    ]
    
    found_models = []
    
    for path_str, description in possible_paths:
        path = Path(path_str)
        if path.exists():
            size_mb = path.stat().st_size / (1024 * 1024)
            found_models.append((path_str, description, size_mb))
            print(f"✅ Found: {path_str}")
            print(f"   Description: {description}")
            print(f"   Size: {size_mb:.2f} MB")
            print()
    
    if not found_models:
        print("❌ No trained models found")
        print()
        print("Available locations checked:")
        for path_str, description in possible_paths:
            print(f"   - {path_str}")
        print()
        print("To train a model, run:")
        print("   python -m football_ai.finetune_base")
        print("   or")
        print("   python -m football_ai.auto_train")
    else:
        print("=" * 60)
        print(f"Found {len(found_models)} trained model(s)")
        print("=" * 60)
        print()
        print("The analysis.py will automatically use the best available model.")
        print("Priority: best.pt > last.pt")
    
    return found_models

if __name__ == "__main__":
    check_trained_models()

