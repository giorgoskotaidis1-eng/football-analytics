"""
Prepare Dataset for YOLOv8 Training
Converts annotated data to YOLOv8 format
"""

import os
import json
import shutil
from pathlib import Path
from typing import List, Dict
import cv2


def convert_coco_to_yolo(coco_json_path: str, images_dir: str, output_dir: str):
    """
    Convert COCO format annotations to YOLOv8 format
    
    Args:
        coco_json_path: Path to COCO JSON annotation file
        images_dir: Directory with images
        output_dir: Output directory for YOLOv8 format
    """
    with open(coco_json_path, "r") as f:
        coco_data = json.load(f)
    
    # Create output directories
    output_images = Path(output_dir) / "images"
    output_labels = Path(output_dir) / "labels"
    output_images.mkdir(parents=True, exist_ok=True)
    output_labels.mkdir(parents=True, exist_ok=True)
    
    # Map COCO category IDs to YOLOv8 class IDs
    # 0: player, 1: ball, 2: goalkeeper
    category_map = {}
    for cat in coco_data["categories"]:
        if "player" in cat["name"].lower():
            category_map[cat["id"]] = 0
        elif "ball" in cat["name"].lower():
            category_map[cat["id"]] = 1
        elif "goalkeeper" in cat["name"].lower():
            category_map[cat["id"]] = 2
    
    # Process images and annotations
    image_info = {img["id"]: img for img in coco_data["images"]}
    annotations = coco_data["annotations"]
    
    for ann in annotations:
        image_id = ann["image_id"]
        if image_id not in image_info:
            continue
        
        image = image_info[image_id]
        image_path = Path(images_dir) / image["file_name"]
        
        if not image_path.exists():
            continue
        
        # Get image dimensions
        img = cv2.imread(str(image_path))
        if img is None:
            continue
        img_height, img_width = img.shape[:2]
        
        # Convert bbox from COCO format (x, y, width, height) to YOLOv8 format (normalized center, width, height)
        x, y, w, h = ann["bbox"]
        x_center = (x + w / 2) / img_width
        y_center = (y + h / 2) / img_height
        width_norm = w / img_width
        height_norm = h / img_height
        
        # Get class ID
        class_id = category_map.get(ann["category_id"], 0)
        
        # Write YOLOv8 label file
        label_file = output_labels / f"{Path(image['file_name']).stem}.txt"
        with open(label_file, "a") as f:
            f.write(f"{class_id} {x_center} {y_center} {width_norm} {height_norm}\n")
        
        # Copy image
        output_image = output_images / image["file_name"]
        if not output_image.exists():
            shutil.copy(image_path, output_image)
    
    print(f"[Prepare] Converted {len(image_info)} images to YOLOv8 format")
    print(f"[Prepare] Output directory: {output_dir}")


def split_dataset(dataset_dir: str, train_ratio: float = 0.7, val_ratio: float = 0.2):
    """
    Split dataset into train/val/test sets
    
    Args:
        dataset_dir: Directory with images and labels
        train_ratio: Ratio for training set
        val_ratio: Ratio for validation set
    """
    dataset_path = Path(dataset_dir)
    images_dir = dataset_path / "images"
    labels_dir = dataset_path / "labels"
    
    # Get all image files
    image_files = list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png"))
    
    import random
    random.shuffle(image_files)
    
    # Split
    total = len(image_files)
    train_count = int(total * train_ratio)
    val_count = int(total * val_ratio)
    
    train_files = image_files[:train_count]
    val_files = image_files[train_count:train_count + val_count]
    test_files = image_files[train_count + val_count:]
    
    # Create directories
    for split in ["train", "val", "test"]:
        (dataset_path / "images" / split).mkdir(parents=True, exist_ok=True)
        (dataset_path / "labels" / split).mkdir(parents=True, exist_ok=True)
    
    # Move files
    for img_file in train_files:
        label_file = labels_dir / f"{img_file.stem}.txt"
        if label_file.exists():
            shutil.move(str(img_file), str(dataset_path / "images" / "train" / img_file.name))
            shutil.move(str(label_file), str(dataset_path / "labels" / "train" / label_file.name))
    
    for img_file in val_files:
        label_file = labels_dir / f"{img_file.stem}.txt"
        if label_file.exists():
            shutil.move(str(img_file), str(dataset_path / "images" / "val" / img_file.name))
            shutil.move(str(label_file), str(dataset_path / "labels" / "val" / label_file.name))
    
    for img_file in test_files:
        label_file = labels_dir / f"{img_file.stem}.txt"
        if label_file.exists():
            shutil.move(str(img_file), str(dataset_path / "images" / "test" / img_file.name))
            shutil.move(str(label_file), str(dataset_path / "labels" / "test" / label_file.name))
    
    print(f"[Prepare] Split dataset: {len(train_files)} train, {len(val_files)} val, {len(test_files)} test")


def download_soccernet_dataset(output_dir: str = "datasets/soccernet"):
    """
    Download SoccerNet dataset (if available)
    Note: Requires SoccerNet API or manual download
    """
    print("[Prepare] SoccerNet dataset download")
    print("[Prepare] Visit https://www.soccer-net.org/ for dataset access")
    print("[Prepare] Or use custom annotated videos")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Prepare dataset for YOLOv8 training")
    parser.add_argument("--coco", type=str, help="COCO JSON annotation file")
    parser.add_argument("--images", type=str, required=True, help="Images directory")
    parser.add_argument("--output", type=str, required=True, help="Output directory")
    parser.add_argument("--split", action="store_true", help="Split into train/val/test")
    
    args = parser.parse_args()
    
    if args.coco:
        convert_coco_to_yolo(args.coco, args.images, args.output)
    
    if args.split:
        split_dataset(args.output)


