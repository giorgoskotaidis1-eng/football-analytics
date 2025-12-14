"""
Extract frames from football match videos for annotation
"""

import cv2
import sys
from pathlib import Path


def extract_frames(
    video_path: str,
    output_dir: str,
    interval: int = 5,
    max_frames: int = None
):
    """
    Extract frames from video at specified intervals
    
    Args:
        video_path: Path to video file
        output_dir: Directory to save frames
        interval: Extract frame every N seconds
        max_frames: Maximum number of frames to extract (None = all)
    """
    video_path = Path(video_path)
    if not video_path.exists():
        print(f"Error: Video file not found: {video_path}", file=sys.stderr)
        return
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        print(f"Error: Could not open video: {video_path}", file=sys.stderr)
        return
    
    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / fps if fps > 0 else 0
    
    print(f"[Extract] Video: {duration:.1f}s, {fps:.1f} FPS, {total_frames} frames", file=sys.stderr)
    
    frame_interval = int(fps * interval) if fps > 0 else 30
    frame_count = 0
    saved_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_count % frame_interval == 0:
            if max_frames and saved_count >= max_frames:
                break
            
            frame_filename = output_path / f"frame_{saved_count:06d}.jpg"
            cv2.imwrite(str(frame_filename), frame)
            saved_count += 1
            
            if saved_count % 50 == 0:
                print(f"[Extract] Extracted {saved_count} frames...", file=sys.stderr)
        
        frame_count += 1
    
    cap.release()
    print(f"[Extract] Done! Extracted {saved_count} frames to {output_path}", file=sys.stderr)


def main():
    """CLI entry point"""
    if len(sys.argv) < 3:
        print("Usage: python -m football_ai.extract_frames <video_path> <output_dir> [interval_seconds] [max_frames]", file=sys.stderr)
        print("Example: python -m football_ai.extract_frames match.mp4 frames/ 5 1000", file=sys.stderr)
        sys.exit(1)
    
    video_path = sys.argv[1]
    output_dir = sys.argv[2]
    interval = int(sys.argv[3]) if len(sys.argv) > 3 else 5
    max_frames = int(sys.argv[4]) if len(sys.argv) > 4 else None
    
    extract_frames(video_path, output_dir, interval, max_frames)


if __name__ == "__main__":
    main()


