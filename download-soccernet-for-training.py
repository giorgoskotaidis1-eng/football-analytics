"""
Complete script to download SoccerNet bounding boxes for YOLOv8 training
"""

import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

try:
    from SoccerNet.Downloader import SoccerNetDownloader
    
    print("=" * 60)
    print("Downloading SoccerNet Player Bounding Boxes")
    print("=" * 60)
    print()
    
    # Initialize downloader
    downloader = SoccerNetDownloader(LocalDirectory="datasets/soccernet_data")
    
    print("Downloading player bounding boxes (MaskRCNN)...")
    print("These contain bounding boxes for players - perfect for training!")
    print()
    
    # Download bounding boxes for train/valid/test
    downloader.downloadGames(
        files=["1_player_boundingbox_maskrcnn.json", "2_player_boundingbox_maskrcnn.json"],
        split=["train", "valid", "test"]
    )
    
    print()
    print("=" * 60)
    print("Download Complete!")
    print("=" * 60)
    print()
    print("Bounding boxes downloaded to: datasets/soccernet_data")
    print()
    print("Next steps:")
    print("  1. Download videos (optional):")
    print("     downloader.downloadGames(files=['1_224p.mkv', '2_224p.mkv'], split=['train', 'valid', 'test'])")
    print("  2. Extract frames from videos")
    print("  3. Match bboxes to frames")
    print("  4. Convert to YOLOv8 format")
    print("  5. Start training")
    print()
    
except ImportError as e:
    print(f"Error: SoccerNet package not installed")
    print(f"Please install: pip install SoccerNet")
    print(f"Or use the extracted package in: datasets/soccernet/soccernet-0.1.62")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)


