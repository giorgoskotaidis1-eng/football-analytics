"""
Comprehensive dataset preparation from all available sources
Automatically finds, downloads, and prepares datasets
"""

import os
import sys
import subprocess
from pathlib import Path
from typing import List, Optional


def check_soccernet() -> Optional[str]:
    """Check if SoccerNet is downloaded"""
    possible_paths = [
        "datasets/soccernet",
        "datasets/SoccerNet",
        "soccernet",
    ]
    
    for path in possible_paths:
        p = Path(path)
        if p.exists():
            annotations = p / "annotations"
            images = p / "images"
            if annotations.exists() or images.exists():
                print(f"[Prepare] Found SoccerNet at: {path}", file=sys.stderr)
                return str(p)
    
    return None


def prepare_soccernet(soccernet_path: str) -> Optional[str]:
    """Prepare SoccerNet dataset"""
    print(f"[Prepare] Preparing SoccerNet...", file=sys.stderr)
    
    annotations_path = Path(soccernet_path) / "annotations"
    images_path = Path(soccernet_path) / "images"
    
    # Find annotation file
    annotation_file = None
    if annotations_path.exists():
        for file in annotations_path.glob("*.json"):
            annotation_file = file
            break
    
    if not annotation_file:
        print("[Prepare] SoccerNet annotations not found", file=sys.stderr)
        return None
    
    # Run prepare_dataset
    output_dir = "datasets/football_yolo"
    cmd = [
        sys.executable, "-m", "football_ai.prepare_dataset",
        "--coco", str(annotation_file),
        "--images", str(images_path),
        "--output", output_dir,
        "--split"
    ]
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(result.stdout, file=sys.stderr)
        print(f"[Prepare] SoccerNet prepared: {output_dir}", file=sys.stderr)
        return output_dir
    except subprocess.CalledProcessError as e:
        print(f"[Prepare] Error: {e}", file=sys.stderr)
        print(e.stderr, file=sys.stderr)
        return None


def find_kaggle_datasets() -> List[str]:
    """Find downloaded Kaggle datasets"""
    kaggle_dir = Path("datasets/kaggle")
    if not kaggle_dir.exists():
        return []
    
    datasets = []
    for item in kaggle_dir.iterdir():
        if item.is_dir():
            # Check if it has images
            if (item / "images").exists() or (item / "train").exists():
                datasets.append(str(item))
    
    return datasets


def prepare_all() -> Optional[str]:
    """Prepare all available datasets"""
    print("=" * 60, file=sys.stderr)
    print("Comprehensive Dataset Preparation", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    print(file=sys.stderr)
    
    prepared_datasets = []
    
    # Check SoccerNet
    soccernet_path = check_soccernet()
    if soccernet_path:
        prepared = prepare_soccernet(soccernet_path)
        if prepared:
            prepared_datasets.append(prepared)
    
    # Check Kaggle
    kaggle_datasets = find_kaggle_datasets()
    if kaggle_datasets:
        print(f"[Prepare] Found {len(kaggle_datasets)} Kaggle datasets", file=sys.stderr)
        # These should already be in YOLO format or need conversion
        for dataset in kaggle_datasets:
            prepared_datasets.append(dataset)
    
    if not prepared_datasets:
        print("[Prepare] No datasets found!", file=sys.stderr)
        print(file=sys.stderr)
        print("Please download datasets:", file=sys.stderr)
        print("  1. SoccerNet: https://www.soccer-net.org/", file=sys.stderr)
        print("  2. Kaggle: https://www.kaggle.com/datasets", file=sys.stderr)
        print("  3. Roboflow: https://roboflow.com/datasets", file=sys.stderr)
        return None
    
    # Combine if multiple
    if len(prepared_datasets) > 1:
        print(f"[Prepare] Combining {len(prepared_datasets)} datasets...", file=sys.stderr)
        # Use the first one as main, or combine them
        main_dataset = prepared_datasets[0]
    else:
        main_dataset = prepared_datasets[0]
    
    print(f"[Prepare] Dataset ready: {main_dataset}", file=sys.stderr)
    return main_dataset


def main():
    """CLI entry point"""
    result = prepare_all()
    
    if result:
        print(file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print("Success!", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(f"[Prepare] Dataset ready: {result}", file=sys.stderr)
        print(f"[Next] Start training: start-background-training.bat", file=sys.stderr)
        return 0
    else:
        print(file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print("No Datasets Found", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())


