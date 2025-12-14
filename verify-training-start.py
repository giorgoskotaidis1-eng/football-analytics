"""
Verify that training can start and check prerequisites
"""

import sys
from pathlib import Path

def check_prerequisites():
    """Check if all prerequisites are met"""
    print("=" * 60)
    print("Training Prerequisites Check")
    print("=" * 60)
    print()
    
    issues = []
    
    # Check Python
    try:
        import sys
        print(f"✅ Python: {sys.version}")
    except:
        issues.append("Python not found")
        print("❌ Python not found")
    
    # Check dependencies
    print()
    print("Checking dependencies...")
    
    deps = {
        "ultralytics": "YOLOv8",
        "cv2": "OpenCV",
        "numpy": "NumPy",
        "yaml": "PyYAML",
    }
    
    for module, name in deps.items():
        try:
            if module == "cv2":
                import cv2
            elif module == "yaml":
                import yaml
            else:
                __import__(module)
            print(f"✅ {name}")
        except ImportError:
            issues.append(f"Missing: {name}")
            print(f"❌ {name} not installed")
    
    # Check SoccerNet package
    print()
    print("Checking SoccerNet package...")
    try:
        from SoccerNet.Downloader import SoccerNetDownloader
        print("✅ SoccerNet package")
    except ImportError:
        issues.append("SoccerNet package not installed")
        print("❌ SoccerNet package not installed")
        print("   Install: pip install SoccerNet")
    
    # Check bounding boxes
    print()
    print("Checking bounding boxes...")
    bbox_files = list(Path("datasets/soccernet_data").rglob("*player_boundingbox_maskrcnn.json"))
    if bbox_files:
        print(f"✅ Found {len(bbox_files)} bounding box files")
    else:
        issues.append("No bounding boxes found")
        print("❌ No bounding boxes found")
    
    # Check videos
    print()
    print("Checking videos...")
    video_files = list(Path("datasets/soccernet_data").rglob("*.mkv"))
    if video_files:
        print(f"✅ Found {len(video_files)} video files")
    else:
        print("⚠️  No videos found (will download)")
    
    # Summary
    print()
    print("=" * 60)
    if issues:
        print("❌ Issues found:")
        for issue in issues:
            print(f"   - {issue}")
        print()
        print("Please fix these issues before starting training.")
    else:
        print("✅ All prerequisites met!")
        print("Ready to start training!")
    print("=" * 60)
    
    return len(issues) == 0

if __name__ == "__main__":
    ready = check_prerequisites()
    sys.exit(0 if ready else 1)

