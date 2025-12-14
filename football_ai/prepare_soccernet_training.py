"""
Complete SoccerNet Training Pipeline
1. Download videos (if needed)
2. Extract frames
3. Match bboxes with frames
4. Convert to YOLOv8 format
5. Train model
"""

import sys
import json
import cv2
import numpy as np
import os
import subprocess
import tempfile
import shutil
from pathlib import Path
from typing import List, Dict, Tuple, Optional
from tqdm import tqdm
import yaml


def _extract_with_opencv(cap, bbox_data, output_images_dir, output_labels_dir, frame_interval, max_frames):
    """Extract frames using OpenCV (for unencrypted videos)"""
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames_video = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    predictions = bbox_data.get("predictions", [])
    if not predictions:
        cap.release()
        return 0
    
    extracted_count = 0
    frame_idx = 0
    
    print(f"[Extract] Video: {total_frames_video} frames, {fps:.1f} FPS, {width}x{height}", file=sys.stderr)
    
    while cap.isOpened() and extracted_count < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_idx % frame_interval == 0:
            if frame_idx < len(predictions):
                frame_prediction = predictions[frame_idx]
                frame_bboxes = frame_prediction.get("bboxes", []) if isinstance(frame_prediction, dict) else []
                
                if frame_bboxes:
                    frame_filename = f"frame_{extracted_count:06d}.jpg"
                    frame_path = output_images_dir / frame_filename
                    cv2.imwrite(str(frame_path), frame)
                    
                    label_filename = f"frame_{extracted_count:06d}.txt"
                    label_path = output_labels_dir / label_filename
                    
                    with open(label_path, "w") as f:
                        for bbox in frame_bboxes:
                            x1, y1, x2, y2 = bbox[:4]
                            center_x = (x1 + x2) / 2.0 / width
                            center_y = (y1 + y2) / 2.0 / height
                            bbox_width = (x2 - x1) / width
                            bbox_height = (y2 - y1) / height
                            f.write(f"0 {center_x:.6f} {center_y:.6f} {bbox_width:.6f} {bbox_height:.6f}\n")
                    
                    extracted_count += 1
                    if extracted_count % 100 == 0:
                        print(f"[Extract] Extracted {extracted_count} frames...", file=sys.stderr)
        
        frame_idx += 1
    
    cap.release()
    return extracted_count


def _process_extracted_frames(extracted_frames, bbox_data, output_images_dir, output_labels_dir, max_frames, frame_interval):
    """Process frames extracted by ffmpeg"""
    predictions = bbox_data.get("predictions", [])
    if not predictions:
        return 0
    
    extracted_count = 0
    
    for i, frame_path in enumerate(extracted_frames[:max_frames]):
        # Map ffmpeg frame index to video frame index
        video_frame_idx = i * frame_interval
        
        if video_frame_idx < len(predictions):
            frame_prediction = predictions[video_frame_idx]
            frame_bboxes = frame_prediction.get("bboxes", []) if isinstance(frame_prediction, dict) else []
            
            if frame_bboxes:
                # Copy frame
                frame_filename = f"frame_{extracted_count:06d}.jpg"
                output_frame = output_images_dir / frame_filename
                shutil.copy2(frame_path, output_frame)
                
                # Get dimensions
                img = cv2.imread(str(frame_path))
                if img is None:
                    continue
                height, width = img.shape[:2]
                
                # Create label
                label_filename = f"frame_{extracted_count:06d}.txt"
                label_path = output_labels_dir / label_filename
                
                with open(label_path, "w") as f:
                    for bbox in frame_bboxes:
                        x1, y1, x2, y2 = bbox[:4]
                        center_x = (x1 + x2) / 2.0 / width
                        center_y = (y1 + y2) / 2.0 / height
                        bbox_width = (x2 - x1) / width
                        bbox_height = (y2 - y1) / height
                        f.write(f"0 {center_x:.6f} {center_y:.6f} {bbox_width:.6f} {bbox_height:.6f}\n")
                
                extracted_count += 1
    
    return extracted_count


def extract_frames_with_bboxes(
    video_path: Path,
    bbox_data: Dict,
    output_images_dir: Path,
    output_labels_dir: Path,
    frame_interval: int = 30,
    max_frames: int = 1000,
    password: str = "s0cc3rn3t"
):
    """
    Extract frames from video and match with bounding boxes
    Handles password-protected videos using ffmpeg
    """
    if not video_path.exists():
        print(f"[Extract] Video not found: {video_path}", file=sys.stderr)
        return 0
    
    # Try OpenCV first
    cap = cv2.VideoCapture(str(video_path))
    if cap.isOpened() and cap.get(cv2.CAP_PROP_FRAME_COUNT) > 0:
        return _extract_with_opencv(cap, bbox_data, output_images_dir, output_labels_dir, frame_interval, max_frames)
    
    # Password-protected - use ffmpeg
    cap.release()
    print(f"[Extract] Using ffmpeg for password-protected video...", file=sys.stderr)
    
    temp_dir = Path(tempfile.mkdtemp())
    try:
        frame_pattern = str(temp_dir / "frame_%06d.jpg")
        cmd = [
            "ffmpeg", "-y",
            "-i", str(video_path),
            "-vf", f"select='not(mod(n\\,{frame_interval}))'",
            "-vsync", "0",
            "-q:v", "2",
            "-frames:v", str(max_frames),
            frame_pattern
        ]
        
        # Try with password
        env = os.environ.copy()
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,
            env=env,
            input="s0cc3rn3t\n"
        )
        
        if result.returncode == 0:
            frames = sorted(temp_dir.glob("frame_*.jpg"))
            if frames:
                print(f"[Extract] Extracted {len(frames)} frames", file=sys.stderr)
                return _process_extracted_frames(frames, bbox_data, output_images_dir, output_labels_dir, max_frames, frame_interval)
        
        # Try without password
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        
        if result.returncode == 0:
            frames = sorted(temp_dir.glob("frame_*.jpg"))
            if frames:
                return _process_extracted_frames(frames, bbox_data, output_images_dir, output_labels_dir, max_frames, frame_interval)
        
        print(f"[Extract] Failed: {result.stderr[:200] if result.stderr else 'Unknown error'}", file=sys.stderr)
        return 0
        
    except Exception as e:
        print(f"[Extract] Error: {e}", file=sys.stderr)
        return 0
    finally:
        if temp_dir.exists():
            try:
                shutil.rmtree(temp_dir)
            except:
                pass


def find_video_for_bbox(bbox_file: Path) -> Optional[Path]:
    """
    Find corresponding video file for a bounding box JSON
    Search ONLY in SoccerNet folder
    """
    game_dir = bbox_file.parent
    bbox_name = bbox_file.name
    
    camera_num = bbox_name.split("_")[0]
    
    # Search ONLY in SoccerNet folder structure
    search_locations = [
        game_dir,  # Same directory as bbox (most likely)
        game_dir.parent,  # Parent directory
        game_dir.parent.parent,  # Grandparent
        Path("datasets/soccernet_data"),  # Root SoccerNet folder
    ]
    
    video_patterns = [
        f"{camera_num}_720p.mkv",
        f"{camera_num}_HQ_25.mkv",
        f"{camera_num}.mkv",
        f"{camera_num}.mp4",
        f"1_{camera_num}_720p.mkv",
        f"2_{camera_num}_720p.mkv",
        f"{camera_num}_720p.MKV",
        f"{camera_num}_HQ_25.MKV",
    ]
    
    ignore_paths = ["venv", "__pycache__", ".git", "node_modules", "site-packages"]
    
    for search_dir in search_locations:
        if not search_dir.exists():
            continue
            
        for pattern in video_patterns:
            video_path = search_dir / pattern
            if video_path.exists():
                video_str = str(video_path)
                if not any(ignore in video_str for ignore in ignore_paths):
                    return video_path
            
            try:
                for video_file in search_dir.rglob(pattern):
                    if video_file.exists():
                        video_str = str(video_file)
                        if any(ignore in video_str for ignore in ignore_paths):
                            continue
                        return video_file
            except (PermissionError, OSError):
                continue
    
    return None


def process_soccernet_to_yolo(
    data_dir: str = "datasets/soccernet_data",
    output_dir: str = "datasets/football_yolo",
    max_games: int = 0,
    frames_per_game: int = 1000
):
    """
    Complete pipeline: Process SoccerNet bboxes + videos to YOLOv8 format
    """
    print("=" * 60, file=sys.stderr)
    print("Processing SoccerNet to YOLOv8 Format", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    print(file=sys.stderr)
    
    data_path = Path(data_dir)
    output_path = Path(output_dir)
    
    for split in ["train", "val", "test"]:
        (output_path / "images" / split).mkdir(parents=True, exist_ok=True)
        (output_path / "labels" / split).mkdir(parents=True, exist_ok=True)
    
    bbox_files = list(data_path.rglob("*player_boundingbox_maskrcnn.json"))
    
    if not bbox_files:
        print("[Error] No bounding box files found!", file=sys.stderr)
        return False
    
    print(f"[Process] Found {len(bbox_files)} bounding box files", file=sys.stderr)
    
    if max_games > 0:
        bbox_files = bbox_files[:max_games * 2]
    else:
        print(f"[Process] Processing ALL available games ({len(bbox_files)} bbox files)", file=sys.stderr)
    
    total_extracted = 0
    games_processed = 0
    processed_games = set()
    
    for bbox_file in tqdm(bbox_files, desc="Processing games", file=sys.stderr):
        video_path = find_video_for_bbox(bbox_file)
        
        if not video_path:
            continue
        
        game_key = video_path.parent
        if game_key in processed_games:
            continue
        processed_games.add(game_key)
        
        try:
            with open(bbox_file, "r") as f:
                bbox_data = json.load(f)
        except Exception as e:
            print(f"[Process] Error loading {bbox_file}: {e}", file=sys.stderr)
            continue
        
        unique_games_count = len(processed_games)
        if unique_games_count == 0:
            unique_games_count = 1
        
        if games_processed < unique_games_count * 0.7:
            split = "train"
        elif games_processed < unique_games_count * 0.9:
            split = "val"
        else:
            split = "test"
        
        extracted = extract_frames_with_bboxes(
            video_path,
            bbox_data,
            output_path / "images" / split,
            output_path / "labels" / split,
            frame_interval=30,
            max_frames=frames_per_game,
            password="s0cc3rn3t"
        )
        
        total_extracted += extracted
        games_processed += 1
        
        if extracted > 0:
            print(f"[Process] Game {games_processed}: {extracted} frames extracted", file=sys.stderr)
    
    print("=" * 60, file=sys.stderr)
    print(f"Processing Complete!", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    print(f"[Process] Processed {len(processed_games)} DIFFERENT games", file=sys.stderr)
    print(f"[Process] Total frames extracted: {total_extracted}", file=sys.stderr)
    print(f"[Process] Output directory: {output_dir}", file=sys.stderr)
    
    if total_extracted == 0:
        print("[Error] No frames extracted!", file=sys.stderr)
        return False
    
    if len(processed_games) < 5:
        print(f"[Warning] Only {len(processed_games)} games processed", file=sys.stderr)
    
    print(file=sys.stderr)
    return True


def create_yolo_dataset_config(output_file: str = "football_dataset.yaml"):
    """Create YOLOv8 dataset configuration file"""
    config = {
        "path": str(Path(output_file).parent / "datasets" / "football_yolo"),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "nc": 2,
        "names": {
            0: "player",
            1: "ball"
        }
    }
    
    with open(output_file, "w") as f:
        yaml.dump(config, f, default_flow_style=False)
    
    print(f"[Config] Created dataset config: {output_file}", file=sys.stderr)
    return output_file


def download_soccernet_videos(data_dir: str = "datasets/soccernet_data", max_games: int = 10):
    """
    Download SoccerNet videos using SoccerNet package
    """
    try:
        from SoccerNet.Downloader import SoccerNetDownloader
        
        print("=" * 60, file=sys.stderr)
        print("Downloading SoccerNet Videos", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(file=sys.stderr)
        
        downloader = SoccerNetDownloader(LocalDirectory=data_dir)
        
        print(f"[Download] Downloading videos ({max_games} games)...", file=sys.stderr)
        print(f"[Download] This will download ~{max_games * 2} videos (2 cameras per game)", file=sys.stderr)
        print("[Download] This may take 2-4 hours...", file=sys.stderr)
        print("[Download] Estimated size: ~50-100 GB", file=sys.stderr)
        print(file=sys.stderr)
        
        download_success = False
        
        try:
            print("[Download] Trying download without task parameter...", file=sys.stderr)
            downloader.downloadGames(
                files=["1_720p.mkv", "2_720p.mkv"],
                split=["train"],
                password="s0cc3rn3t"
            )
            download_success = True
        except Exception as e1:
            print(f"[Download] Method 1 failed: {e1}", file=sys.stderr)
            
            try:
                print("[Download] Trying with action-spotting task...", file=sys.stderr)
                downloader.downloadGames(
                    files=["1_720p.mkv", "2_720p.mkv"],
                    split=["train"],
                    task="action-spotting",
                    password="s0cc3rn3t"
                )
                download_success = True
            except Exception as e2:
                print(f"[Download] Method 2 failed: {e2}", file=sys.stderr)
                
                try:
                    print("[Download] Trying with challenge task...", file=sys.stderr)
                    downloader.downloadGames(
                        files=["1_720p.mkv", "2_720p.mkv"],
                        split=["train"],
                        task="challenge",
                        password="s0cc3rn3t"
                    )
                    download_success = True
                except Exception as e3:
                    print(f"[Download] All methods failed!", file=sys.stderr)
                    print(f"[Download] Last error: {e3}", file=sys.stderr)
                    raise e3
        
        if not download_success:
            raise Exception("All download methods failed")
        
        print(file=sys.stderr)
        print("[Download] Videos downloaded!", file=sys.stderr)
        return True
        
    except ImportError:
        print("[Error] SoccerNet package not installed", file=sys.stderr)
        print("[Error] Install: pip install SoccerNet", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[Error] Download failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


def main():
    """Main pipeline"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Complete SoccerNet training pipeline")
    parser.add_argument("--download-videos", action="store_true", help="Download videos from SoccerNet")
    parser.add_argument("--process", action="store_true", help="Process bboxes + videos to YOLOv8 format")
    parser.add_argument("--train", action="store_true", help="Train YOLOv8 model")
    parser.add_argument("--max-games", type=int, default=10, help="Max games to process")
    parser.add_argument("--frames-per-game", type=int, default=1000, help="Max frames per game")
    parser.add_argument("--all", action="store_true", help="Run complete pipeline")
    
    args = parser.parse_args()
    
    if args.all or args.download_videos:
        print("[Pipeline] Step 1: Downloading videos...", file=sys.stderr)
        download_soccernet_videos(max_games=args.max_games)
    
    if args.all or args.process:
        print(file=sys.stderr)
        print("[Pipeline] Step 2: Processing to YOLOv8 format...", file=sys.stderr)
        success = process_soccernet_to_yolo(
            max_games=args.max_games,
            frames_per_game=args.frames_per_game
        )
        
        if success:
            print(file=sys.stderr)
            print("[Pipeline] Step 3: Creating dataset config...", file=sys.stderr)
            create_yolo_dataset_config()
    
    if args.all or args.train:
        print(file=sys.stderr)
        print("[Pipeline] Step 4: Training model...", file=sys.stderr)
        
        dataset_path = Path("datasets/football_yolo")
        train_images = list((dataset_path / "images" / "train").glob("*.jpg")) if (dataset_path / "images" / "train").exists() else []
        
        if not train_images:
            print("[Error] No training images found!", file=sys.stderr)
            print("[Error] Dataset processing failed or no videos found.", file=sys.stderr)
            print("[Error] Please check:", file=sys.stderr)
            return
        
        print(f"[Train] Found {len(train_images)} training images", file=sys.stderr)
        
        import torch
        device = "0" if torch.cuda.is_available() else "cpu"
        print(f"[Train] Using device: {device}", file=sys.stderr)
        
        from football_ai.train import train_model
        
        dataset_config = "football_dataset.yaml"
        if not Path(dataset_config).exists():
            create_yolo_dataset_config()
        
        train_model(
            base_model="yolov8s.pt",
            dataset_config=dataset_config,
            epochs=100,
            device=device,
            name="football_soccernet"
        )


if __name__ == "__main__":
    main()
