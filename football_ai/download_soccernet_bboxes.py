"""
Download SoccerNet Player Bounding Boxes and prepare for YOLOv8 training
This downloads the MaskRCNN bounding boxes which are perfect for training!
"""

import sys
from pathlib import Path
import json
import cv2
import numpy as np
from typing import List, Dict, Tuple


def download_soccernet_bboxes():
    """Download SoccerNet player bounding boxes"""
    try:
        from SoccerNet.Downloader import SoccerNetDownloader
        
        print("=" * 60, file=sys.stderr)
        print("Downloading SoccerNet Player Bounding Boxes", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(file=sys.stderr)
        
        # Initialize downloader
        downloader = SoccerNetDownloader(LocalDirectory="datasets/soccernet_data")
        
        print("[Download] Downloading player bounding boxes (MaskRCNN)...", file=sys.stderr)
        print("[Download] This contains bounding boxes for players - perfect for training!", file=sys.stderr)
        print(file=sys.stderr)
        
        # Download bounding boxes for train/valid/test
        downloader.downloadGames(
            files=["1_player_boundingbox_maskrcnn.json", "2_player_boundingbox_maskrcnn.json"],
            split=["train", "valid", "test"]
        )
        
        print(file=sys.stderr)
        print("[Download] Bounding boxes downloaded!", file=sys.stderr)
        print("[Download] Location: datasets/soccernet_data", file=sys.stderr)
        
        return True
        
    except ImportError:
        print("[Error] SoccerNet package not installed", file=sys.stderr)
        print("[Error] Please install: pip install SoccerNet", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[Error] Download failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


def convert_bbox_to_yolo(bbox: Dict, img_width: int, img_height: int) -> Tuple[float, float, float, float]:
    """
    Convert SoccerNet bbox format to YOLOv8 format
    
    SoccerNet format: {"x1": x1, "y1": y1, "x2": x2, "y2": y2}
    YOLOv8 format: (center_x, center_y, width, height) normalized to 0-1
    """
    x1 = bbox.get("x1", 0)
    y1 = bbox.get("y1", 0)
    x2 = bbox.get("x2", img_width)
    y2 = bbox.get("y2", img_height)
    
    # Calculate center and dimensions
    center_x = (x1 + x2) / 2.0
    center_y = (y1 + y2) / 2.0
    width = x2 - x1
    height = y2 - y1
    
    # Normalize to 0-1
    center_x_norm = center_x / img_width
    center_y_norm = center_y / img_height
    width_norm = width / img_width
    height_norm = height / img_height
    
    return (center_x_norm, center_y_norm, width_norm, height_norm)


def process_soccernet_bboxes(data_dir: str = "datasets/soccernet_data", output_dir: str = "datasets/football_yolo"):
    """
    Process SoccerNet bounding boxes and convert to YOLOv8 format
    
    Note: SoccerNet bboxes are per frame, we need to:
    1. Download videos
    2. Extract frames
    3. Match bboxes to frames
    4. Convert to YOLOv8 format
    """
    data_path = Path(data_dir)
    output_path = Path(output_dir)
    
    # Create output structure
    for split in ["train", "val", "test"]:
        (output_path / "images" / split).mkdir(parents=True, exist_ok=True)
        (output_path / "labels" / split).mkdir(parents=True, exist_ok=True)
    
    print("=" * 60, file=sys.stderr)
    print("Processing SoccerNet Bounding Boxes", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    print(file=sys.stderr)
    
    # Find all bbox JSON files
    bbox_files = list(data_path.rglob("*player_boundingbox_maskrcnn.json"))
    
    if not bbox_files:
        print("[Error] No bounding box files found!", file=sys.stderr)
        print("[Error] Please download bounding boxes first:", file=sys.stderr)
        print("  python -m football_ai.download_soccernet_bboxes", file=sys.stderr)
        return False
    
    print(f"[Process] Found {len(bbox_files)} bounding box files", file=sys.stderr)
    print(file=sys.stderr)
    print("[Process] Note: This requires videos to extract frames", file=sys.stderr)
    print("[Process] For now, we'll prepare the structure", file=sys.stderr)
    print(file=sys.stderr)
    
    # Process each file
    total_bboxes = 0
    for bbox_file in bbox_files:
        print(f"[Process] Processing: {bbox_file.name}", file=sys.stderr)
        
        with open(bbox_file, 'r') as f:
            bbox_data = json.load(f)
        
        # SoccerNet bbox format: frame -> list of bboxes
        # Each bbox: {"x1": x, "y1": y, "x2": x, "y2": y, "confidence": conf}
        
        frame_count = len(bbox_data)
        bboxes_in_file = sum(len(bboxes) for bboxes in bbox_data.values())
        total_bboxes += bboxes_in_file
        
        print(f"  Frames: {frame_count}, Bounding boxes: {bboxes_in_file}", file=sys.stderr)
    
    print(file=sys.stderr)
    print(f"[Process] Total bounding boxes found: {total_bboxes}", file=sys.stderr)
    print(file=sys.stderr)
    print("[Process] Next steps:", file=sys.stderr)
    print("  1. Download videos: download_soccernet_videos()", file=sys.stderr)
    print("  2. Extract frames: extract_frames_from_videos()", file=sys.stderr)
    print("  3. Match bboxes to frames: match_bboxes_to_frames()", file=sys.stderr)
    print("  4. Convert to YOLOv8: convert_to_yolo_format()", file=sys.stderr)
    
    return True


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Download and process SoccerNet bounding boxes")
    parser.add_argument("--download", action="store_true", help="Download bounding boxes")
    parser.add_argument("--process", action="store_true", help="Process bounding boxes")
    
    args = parser.parse_args()
    
    if args.download:
        success = download_soccernet_bboxes()
        sys.exit(0 if success else 1)
    elif args.process:
        success = process_soccernet_bboxes()
        sys.exit(0 if success else 1)
    else:
        # Do both
        print("Downloading and processing SoccerNet bounding boxes...", file=sys.stderr)
        download_success = download_soccernet_bboxes()
        if download_success:
            process_soccernet_bboxes()
        sys.exit(0 if download_success else 1)


if __name__ == "__main__":
    main()


