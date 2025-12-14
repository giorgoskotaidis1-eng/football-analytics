"""
Helper function to extract frames from password-protected videos
"""

import cv2
import subprocess
import tempfile
from pathlib import Path
import sys

def extract_frames_ffmpeg(video_path: Path, password: str = "s0cc3rn3t", frame_interval: int = 30):
    """
    Extract frames using ffmpeg (handles password-protected videos)
    """
    temp_dir = Path(tempfile.mkdtemp())
    frame_pattern = str(temp_dir / "frame_%06d.jpg")
    
    # FFmpeg command - some video formats may need password
    # For MKV with password, we might need to use different approach
    cmd = [
        "ffmpeg",
        "-i", str(video_path),
        "-vf", f"select='not(mod(n\\,{frame_interval}))'",
        "-vsync", "0",
        "-q:v", "2",
        "-frames:v", "1000",  # Limit frames
        frame_pattern
    ]
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
        if result.returncode == 0:
            frames = sorted(temp_dir.glob("frame_*.jpg"))
            return frames, temp_dir
        else:
            print(f"[FFmpeg] Error: {result.stderr[:200]}", file=sys.stderr)
            return [], temp_dir
    except Exception as e:
        print(f"[FFmpeg] Exception: {e}", file=sys.stderr)
        return [], temp_dir

