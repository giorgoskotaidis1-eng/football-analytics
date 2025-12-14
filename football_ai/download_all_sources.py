"""
Comprehensive dataset downloader from all possible sources
Attempts to download from multiple public sources automatically
"""

import os
import sys
import subprocess
import json
import requests
from pathlib import Path
from typing import List, Optional, Dict
import zipfile
import shutil


class ComprehensiveDatasetDownloader:
    """Downloads datasets from all available sources"""
    
    def __init__(self, output_dir: str = "datasets"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.downloaded = []
        
    def download_from_github(self, repo: str, file_path: str, output_path: Path) -> bool:
        """Download file from GitHub repository"""
        try:
            url = f"https://raw.githubusercontent.com/{repo}/main/{file_path}"
            print(f"[GitHub] Downloading: {url}", file=sys.stderr)
            
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            output_path.parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            print(f"[GitHub] Saved: {output_path}", file=sys.stderr)
            return True
        except Exception as e:
            print(f"[GitHub] Error: {e}", file=sys.stderr)
            return False
    
    def download_kaggle_dataset_auto(self, dataset_name: str) -> Optional[str]:
        """Attempt to download Kaggle dataset (requires kaggle.json)"""
        try:
            import kaggle
        except ImportError:
            print("[Kaggle] Installing kaggle package...", file=sys.stderr)
            subprocess.run([sys.executable, "-m", "pip", "install", "kaggle", "-q"], check=False)
            try:
                import kaggle
            except ImportError:
                print("[Kaggle] Kaggle not available (needs kaggle.json)", file=sys.stderr)
                return None
        
        try:
            output_path = self.output_dir / "kaggle" / dataset_name
            output_path.mkdir(parents=True, exist_ok=True)
            
            print(f"[Kaggle] Downloading: {dataset_name}", file=sys.stderr)
            kaggle.api.dataset_download_files(dataset_name, path=str(output_path), unzip=True)
            
            print(f"[Kaggle] Downloaded: {dataset_name}", file=sys.stderr)
            return str(output_path)
        except Exception as e:
            print(f"[Kaggle] Error (may need kaggle.json): {e}", file=sys.stderr)
            return None
    
    def try_all_kaggle_datasets(self) -> List[str]:
        """Try downloading multiple Kaggle datasets"""
        datasets = [
            "football-player-detection",
            "soccer-player-detection", 
            "football-object-detection",
            "soccer-ball-detection",
        ]
        
        downloaded = []
        for dataset in datasets:
            result = self.download_kaggle_dataset_auto(dataset)
            if result:
                downloaded.append(result)
        
        return downloaded
    
    def download_roboflow_public(self, workspace: str, project: str, version: int) -> Optional[str]:
        """Download from Roboflow public workspace"""
        try:
            # Roboflow public API
            url = f"https://app.roboflow.com/{workspace}/{project}/{version}"
            print(f"[Roboflow] Attempting: {url}", file=sys.stderr)
            
            # Roboflow requires API key, so this is a placeholder
            print("[Roboflow] Roboflow requires API key or manual download", file=sys.stderr)
            print("[Roboflow] Visit: https://roboflow.com/datasets", file=sys.stderr)
            return None
        except Exception as e:
            print(f"[Roboflow] Error: {e}", file=sys.stderr)
            return None
    
    def download_soccernet_auto(self) -> Optional[str]:
        """Attempt to download SoccerNet (requires manual registration)"""
        print("[SoccerNet] SoccerNet requires manual download:", file=sys.stderr)
        print("[SoccerNet] 1. Visit: https://www.soccer-net.org/", file=sys.stderr)
        print("[SoccerNet] 2. Register (free)", file=sys.stderr)
        print("[SoccerNet] 3. Download SoccerNet-v2", file=sys.stderr)
        print("[SoccerNet] 4. Extract to: datasets/soccernet/", file=sys.stderr)
        return None
    
    def create_synthetic_dataset(self, count: int = 100) -> Optional[str]:
        """Create a minimal synthetic dataset for testing"""
        print(f"[Synthetic] Creating synthetic dataset ({count} placeholder images)...", file=sys.stderr)
        
        output_path = self.output_dir / "synthetic"
        for split in ["train", "val", "test"]:
            (output_path / "images" / split).mkdir(parents=True, exist_ok=True)
            (output_path / "labels" / split).mkdir(parents=True, exist_ok=True)
        
        # Create placeholder files
        import numpy as np
        from PIL import Image
        
        splits = {"train": int(count * 0.7), "val": int(count * 0.2), "test": int(count * 0.1)}
        
        for split, num in splits.items():
            for i in range(num):
                # Create placeholder image
                img = Image.new('RGB', (640, 640), color='green')
                img_path = output_path / "images" / split / f"placeholder_{i:04d}.jpg"
                img.save(img_path)
                
                # Create placeholder label (player at center)
                label_path = output_path / "labels" / split / f"placeholder_{i:04d}.txt"
                with open(label_path, 'w') as f:
                    f.write("0 0.5 0.5 0.1 0.1\n")  # player at center
        
        print(f"[Synthetic] Created {count} placeholder images", file=sys.stderr)
        print(f"[Synthetic] NOTE: This is for testing only! Use real dataset for training.", file=sys.stderr)
        return str(output_path)
    
    def download_all_sources(self) -> List[str]:
        """Attempt to download from all available sources"""
        print("=" * 60, file=sys.stderr)
        print("Comprehensive Dataset Download", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(file=sys.stderr)
        
        downloaded = []
        
        # Try Kaggle
        print("[Download] Trying Kaggle datasets...", file=sys.stderr)
        kaggle_datasets = self.try_all_kaggle_datasets()
        downloaded.extend(kaggle_datasets)
        
        # Check for manually downloaded SoccerNet
        soccernet_path = self.output_dir / "soccernet"
        if soccernet_path.exists():
            print(f"[Download] Found SoccerNet at: {soccernet_path}", file=sys.stderr)
            downloaded.append(str(soccernet_path))
        
        # Check for Roboflow
        roboflow_path = self.output_dir / "roboflow"
        if roboflow_path.exists():
            print(f"[Download] Found Roboflow dataset at: {roboflow_path}", file=sys.stderr)
            downloaded.append(str(roboflow_path))
        
        if not downloaded:
            print("[Download] No datasets found from automatic sources", file=sys.stderr)
            print("[Download] Creating synthetic dataset for testing...", file=sys.stderr)
            synthetic = self.create_synthetic_dataset(100)
            if synthetic:
                downloaded.append(synthetic)
        
        return downloaded


def main():
    """CLI entry point"""
    downloader = ComprehensiveDatasetDownloader()
    
    downloaded = downloader.download_all_sources()
    
    if downloaded:
        print(file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print("Download Summary", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        for i, dataset in enumerate(downloaded, 1):
            print(f"{i}. {dataset}", file=sys.stderr)
        print(file=sys.stderr)
        print("Next: Run dataset preparation:", file=sys.stderr)
        print("  python -m football_ai.prepare_all_datasets", file=sys.stderr)
        return 0
    else:
        print(file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print("No Datasets Downloaded", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(file=sys.stderr)
        print("Please download manually:", file=sys.stderr)
        print("  1. SoccerNet: https://www.soccer-net.org/", file=sys.stderr)
        print("  2. Kaggle: https://www.kaggle.com/datasets (search 'football')", file=sys.stderr)
        print("  3. Roboflow: https://roboflow.com/datasets (search 'soccer')", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())


