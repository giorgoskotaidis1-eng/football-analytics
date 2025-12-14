"""
Download SoccerNet dataset using the official SoccerNet package
"""

import sys
from pathlib import Path

def download_soccernet_dataset():
    """Download SoccerNet dataset using SoccerNet package"""
    try:
        from SoccerNet.Downloader import SoccerNetDownloader
        
        print("=" * 60, file=sys.stderr)
        print("Downloading SoccerNet Dataset", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(file=sys.stderr)
        
        # Initialize downloader
        downloader = SoccerNetDownloader(LocalDirectory="datasets/soccernet_data")
        
        # Download dataset (this will download videos and annotations)
        print("[Download] Downloading SoccerNet dataset...", file=sys.stderr)
        print("[Download] This may take a while (several GB)...", file=sys.stderr)
        print(file=sys.stderr)
        
        # Download videos and annotations
        # Note: This downloads the full dataset which is very large
        # For training, we might only need a subset
        
        downloader.downloadGames(files=["1_Resized.mkv", "2_Resized.mkv"], split=["train", "valid", "test", "challenge"])
        
        print(file=sys.stderr)
        print("[Download] Dataset download complete!", file=sys.stderr)
        print("[Download] Location: datasets/soccernet_data", file=sys.stderr)
        
        return True
        
    except ImportError:
        print("[Error] SoccerNet package not installed", file=sys.stderr)
        print("[Error] Installing SoccerNet package...", file=sys.stderr)
        
        # Try to install from extracted package
        package_path = Path("datasets/soccernet/soccernet-0.1.62")
        if package_path.exists():
            import subprocess
            subprocess.run([sys.executable, "-m", "pip", "install", str(package_path)], check=False)
            # Try again
            try:
                from SoccerNet.Downloader import SoccerNetDownloader
                return download_soccernet_dataset()
            except:
                pass
        
        print("[Error] Please install SoccerNet manually:", file=sys.stderr)
        print("  pip install SoccerNet", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[Error] Download failed: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = download_soccernet_dataset()
    sys.exit(0 if success else 1)


