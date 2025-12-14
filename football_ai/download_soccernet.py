"""
Download and prepare SoccerNet dataset for training
Note: This requires manual download from https://www.soccer-net.org/
"""

import os
import sys
from pathlib import Path
import json
import shutil


def check_soccernet_downloaded(soccernet_path: str) -> bool:
    """Check if SoccerNet dataset is already downloaded"""
    path = Path(soccernet_path)
    if not path.exists():
        return False
    
    # Check for typical SoccerNet structure
    annotations_dir = path / "annotations"
    images_dir = path / "images"
    
    return annotations_dir.exists() and images_dir.exists()


def download_soccernet_instructions():
    """Print instructions for downloading SoccerNet"""
    print("=" * 60)
    print("SoccerNet Dataset Download Instructions")
    print("=" * 60)
    print()
    print("1. Visit: https://www.soccer-net.org/")
    print("2. Register for free account")
    print("3. Download 'SoccerNet-v2' dataset")
    print("4. Extract to a folder (e.g., datasets/soccernet/)")
    print()
    print("Dataset structure should be:")
    print("  datasets/soccernet/")
    print("    ├── annotations/")
    print("    │   └── instances.json (COCO format)")
    print("    └── images/")
    print("        └── *.jpg")
    print()
    print("After download, run:")
    print("  python -m football_ai.prepare_dataset \\")
    print("    --coco datasets/soccernet/annotations/instances.json \\")
    print("    --images datasets/soccernet/images \\")
    print("    --output datasets/football_yolo \\")
    print("    --split")
    print()
    print("=" * 60)


def create_minimal_dataset_for_finetuning(output_dir: str = "datasets/football_yolo_minimal"):
    """
    Create a minimal dataset structure for fine-tuning
    This uses the base model's pre-trained weights and fine-tunes on minimal data
    """
    output_path = Path(output_dir)
    
    # Create directory structure
    for split in ["train", "val", "test"]:
        (output_path / "images" / split).mkdir(parents=True, exist_ok=True)
        (output_path / "labels" / split).mkdir(parents=True, exist_ok=True)
    
    print(f"[Download] Created minimal dataset structure at: {output_dir}")
    print(f"[Download] This is a placeholder - you need to add annotated images")
    print(f"[Download] See DATASET_PREPARATION.md for instructions")
    
    return output_dir


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="SoccerNet dataset download helper")
    parser.add_argument("--check", type=str, help="Check if SoccerNet is downloaded at path")
    parser.add_argument("--create-minimal", action="store_true", help="Create minimal dataset structure")
    
    args = parser.parse_args()
    
    if args.check:
        if check_soccernet_downloaded(args.check):
            print(f"[Download] SoccerNet found at: {args.check}")
        else:
            print(f"[Download] SoccerNet not found at: {args.check}")
            download_soccernet_instructions()
    elif args.create_minimal:
        create_minimal_dataset_for_finetuning()
    else:
        download_soccernet_instructions()


