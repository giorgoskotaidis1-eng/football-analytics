"""
Automatic Training Script
Starts training with best available settings
"""

import os
import sys
from pathlib import Path
from ultralytics import YOLO
import yaml
import torch


def check_gpu():
    """Check if GPU is available"""
    if torch.cuda.is_available():
        gpu_count = torch.cuda.device_count()
        gpu_name = torch.cuda.get_device_name(0) if gpu_count > 0 else "Unknown"
        print(f"[AutoTrain] GPU detected: {gpu_name} ({gpu_count} device(s))", file=sys.stderr)
        return "0"
    else:
        print("[AutoTrain] No GPU detected, using CPU (training will be slower)", file=sys.stderr)
        return "cpu"


def find_dataset():
    """Find available dataset"""
    possible_paths = [
        "datasets/football_yolo",
        "datasets/football_yolo_minimal",
        "datasets/soccernet",
    ]
    
    for path in possible_paths:
        dataset_path = Path(path)
        if dataset_path.exists():
            # Check if it has the right structure
            images_dir = dataset_path / "images"
            labels_dir = dataset_path / "labels"
            
            if images_dir.exists() or (dataset_path / "train").exists():
                print(f"[AutoTrain] Found dataset at: {path}", file=sys.stderr)
                return str(dataset_path)
    
    return None


def create_dataset_config(dataset_path: str, output_path: str = "football_dataset.yaml"):
    """Create YOLOv8 dataset config"""
    dataset_path_obj = Path(dataset_path)
    
    # Check structure
    if (dataset_path_obj / "images" / "train").exists():
        # YOLOv8 format
        train_path = "images/train"
        val_path = "images/val"
        test_path = "images/test"
    elif (dataset_path_obj / "train").exists():
        # Alternative structure
        train_path = "train"
        val_path = "val"
        test_path = "test"
    else:
        raise ValueError(f"Invalid dataset structure at {dataset_path}")
    
    config = {
        "path": str(dataset_path_obj.absolute()),
        "train": train_path,
        "val": val_path,
        "test": test_path,
        "nc": 3,
        "names": {
            0: "player",
            1: "ball",
            2: "goalkeeper"
        }
    }
    
    with open(output_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)
    
    print(f"[AutoTrain] Created dataset config: {output_path}", file=sys.stderr)
    return output_path


def auto_train():
    """Automatically start training with best settings"""
    print("=" * 60, file=sys.stderr)
    print("Automatic YOLOv8 Training", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    print(file=sys.stderr)
    
    # Check GPU
    device = check_gpu()
    
    # Find dataset
    dataset_path = find_dataset()
    if not dataset_path:
        print("=" * 60, file=sys.stderr)
        print("ERROR: No dataset found!", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(file=sys.stderr)
        print("Please prepare a dataset first:", file=sys.stderr)
        print("  1. Download SoccerNet from https://www.soccer-net.org/", file=sys.stderr)
        print("  2. Or annotate your own videos with LabelImg", file=sys.stderr)
        print("  3. Place in datasets/football_yolo/", file=sys.stderr)
        print(file=sys.stderr)
        print("See DATASET_PREPARATION.md for details", file=sys.stderr)
        sys.exit(1)
    
    # Create dataset config
    dataset_config = create_dataset_config(dataset_path)
    
    # Determine batch size based on device
    if device == "cpu":
        batch_size = 4
        epochs = 50  # Fewer epochs for CPU
    else:
        batch_size = 16
        epochs = 100
    
    # Use yolov8s as base (good balance of speed/accuracy)
    base_model = "yolov8s.pt"
    
    print(f"[AutoTrain] Starting training...", file=sys.stderr)
    print(f"[AutoTrain] Dataset: {dataset_path}", file=sys.stderr)
    print(f"[AutoTrain] Base model: {base_model}", file=sys.stderr)
    print(f"[AutoTrain] Epochs: {epochs}", file=sys.stderr)
    print(f"[AutoTrain] Batch size: {batch_size}", file=sys.stderr)
    print(f"[AutoTrain] Device: {device}", file=sys.stderr)
    print(f"[AutoTrain] This will take 4-8 hours (GPU) or 1-2 days (CPU)", file=sys.stderr)
    print(file=sys.stderr)
    
    # Load model
    model = YOLO(base_model)
    
    # Train
    try:
        results = model.train(
            data=dataset_config,
            epochs=epochs,
            imgsz=640,
            batch=batch_size,
            device=device,
            project="football_models",
            name="football_auto",
            patience=20,
            save=True,
            plots=True,
            val=True,
            verbose=True,
        )
        
        print(file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print("Training Complete!", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(f"[AutoTrain] Best model: football_models/football_auto/weights/best.pt", file=sys.stderr)
        print(f"[AutoTrain] Results: football_models/football_auto/", file=sys.stderr)
        print(file=sys.stderr)
        
        return results
        
    except KeyboardInterrupt:
        print(file=sys.stderr)
        print("[AutoTrain] Training interrupted by user", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"[AutoTrain] Training failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    auto_train()


