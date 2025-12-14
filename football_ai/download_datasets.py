"""
Automatically download and prepare multiple football datasets
Downloads from public sources and prepares for training
"""

import os
import sys
import json
import shutil
import zipfile
import requests
from pathlib import Path
from typing import List, Dict, Optional
import subprocess


class DatasetDownloader:
    """Downloads and prepares football datasets from multiple sources"""
    
    def __init__(self, output_dir: str = "datasets"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.datasets_dir = self.output_dir / "football_yolo"
        self.downloaded_count = 0
        
    def download_file(self, url: str, output_path: Path, chunk_size: int = 8192) -> bool:
        """Download file with progress"""
        try:
            print(f"[Download] Downloading: {url}", file=sys.stderr)
            response = requests.get(url, stream=True, timeout=30)
            response.raise_for_status()
            
            total_size = int(response.headers.get('content-length', 0))
            downloaded = 0
            
            with open(output_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=chunk_size):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if total_size > 0:
                            percent = (downloaded / total_size) * 100
                            print(f"\r[Download] Progress: {percent:.1f}%", end='', file=sys.stderr)
            
            print(f"\n[Download] Saved: {output_path}", file=sys.stderr)
            return True
        except Exception as e:
            print(f"\n[Download] Error: {e}", file=sys.stderr)
            return False
    
    def download_soccernet(self) -> Optional[str]:
        """Download SoccerNet dataset (requires manual registration)"""
        print("=" * 60, file=sys.stderr)
        print("SoccerNet Dataset", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(file=sys.stderr)
        print("SoccerNet requires manual download:", file=sys.stderr)
        print("1. Visit: https://www.soccer-net.org/", file=sys.stderr)
        print("2. Register (free)", file=sys.stderr)
        print("3. Download SoccerNet-v2", file=sys.stderr)
        print("4. Extract to: datasets/soccernet/", file=sys.stderr)
        print(file=sys.stderr)
        print("After download, run:", file=sys.stderr)
        print("  python -m football_ai.prepare_dataset \\", file=sys.stderr)
        print("    --coco datasets/soccernet/annotations/instances.json \\", file=sys.stderr)
        print("    --images datasets/soccernet/images \\", file=sys.stderr)
        print("    --output datasets/football_yolo \\", file=sys.stderr)
        print("    --split", file=sys.stderr)
        print(file=sys.stderr)
        return None
    
    def download_roboflow_dataset(self, dataset_url: str) -> Optional[str]:
        """Download dataset from Roboflow (if public)"""
        print(f"[Roboflow] Attempting to download from: {dataset_url}", file=sys.stderr)
        # Roboflow requires API key, so this is a placeholder
        print("[Roboflow] Roboflow datasets require API key", file=sys.stderr)
        print("[Roboflow] Visit: https://roboflow.com/datasets for public datasets", file=sys.stderr)
        return None
    
    def download_kaggle_dataset(self, dataset_name: str) -> Optional[str]:
        """Download dataset from Kaggle"""
        print(f"[Kaggle] Attempting to download: {dataset_name}", file=sys.stderr)
        
        # Check if kaggle is installed
        try:
            import kaggle
        except ImportError:
            print("[Kaggle] Installing kaggle package...", file=sys.stderr)
            subprocess.run([sys.executable, "-m", "pip", "install", "kaggle"], check=False)
            try:
                import kaggle
            except ImportError:
                print("[Kaggle] Failed to install kaggle. Please install manually:", file=sys.stderr)
                print("  pip install kaggle", file=sys.stderr)
                print("  Then set up API credentials: https://www.kaggle.com/docs/api", file=sys.stderr)
                return None
        
        try:
            output_path = self.output_dir / "kaggle" / dataset_name
            output_path.mkdir(parents=True, exist_ok=True)
            
            print(f"[Kaggle] Downloading to: {output_path}", file=sys.stderr)
            kaggle.api.dataset_download_files(dataset_name, path=str(output_path), unzip=True)
            
            print(f"[Kaggle] Downloaded: {dataset_name}", file=sys.stderr)
            return str(output_path)
        except Exception as e:
            print(f"[Kaggle] Error: {e}", file=sys.stderr)
            return None
    
    def download_public_football_datasets(self) -> List[str]:
        """Download from multiple public sources"""
        downloaded = []
        
        # Try Kaggle datasets
        kaggle_datasets = [
            "football-player-detection",
            "soccer-player-detection",
            "football-object-detection",
        ]
        
        for dataset in kaggle_datasets:
            result = self.download_kaggle_dataset(dataset)
            if result:
                downloaded.append(result)
        
        return downloaded
    
    def create_combined_dataset(self, source_dirs: List[str]) -> str:
        """Combine multiple datasets into one"""
        print("=" * 60, file=sys.stderr)
        print("Combining Datasets", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(file=sys.stderr)
        
        combined_dir = self.datasets_dir
        for split in ["train", "val", "test"]:
            (combined_dir / "images" / split).mkdir(parents=True, exist_ok=True)
            (combined_dir / "labels" / split).mkdir(parents=True, exist_ok=True)
        
        total_images = 0
        
        for source_dir in source_dirs:
            source_path = Path(source_dir)
            if not source_path.exists():
                continue
            
            print(f"[Combine] Processing: {source_dir}", file=sys.stderr)
            
            # Copy images and labels
            for split in ["train", "val", "test"]:
                source_images = source_path / "images" / split
                source_labels = source_path / "labels" / split
                
                if source_images.exists():
                    for img_file in source_images.glob("*.jpg"):
                        dest = combined_dir / "images" / split / f"{source_path.name}_{img_file.name}"
                        shutil.copy(img_file, dest)
                        total_images += 1
                
                if source_labels.exists():
                    for label_file in source_labels.glob("*.txt"):
                        dest = combined_dir / "labels" / split / f"{source_path.name}_{label_file.name}"
                        shutil.copy(label_file, dest)
        
        print(f"[Combine] Combined {total_images} images", file=sys.stderr)
        return str(combined_dir)
    
    def auto_download_and_prepare(self) -> Optional[str]:
        """Automatically download and prepare datasets"""
        print("=" * 60, file=sys.stderr)
        print("Automatic Dataset Download & Preparation", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(file=sys.stderr)
        
        downloaded = []
        
        # Try public sources
        print("[Auto] Searching for public datasets...", file=sys.stderr)
        public_datasets = self.download_public_football_datasets()
        downloaded.extend(public_datasets)
        
        # Check for manually downloaded SoccerNet
        soccernet_path = self.output_dir / "soccernet"
        if soccernet_path.exists():
            print(f"[Auto] Found SoccerNet at: {soccernet_path}", file=sys.stderr)
            downloaded.append(str(soccernet_path))
        
        if not downloaded:
            print("[Auto] No datasets found. Please download manually:", file=sys.stderr)
            print("  1. SoccerNet: https://www.soccer-net.org/", file=sys.stderr)
            print("  2. Roboflow: https://roboflow.com/datasets", file=sys.stderr)
            print("  3. Kaggle: https://www.kaggle.com/datasets", file=sys.stderr)
            return None
        
        # Combine datasets
        combined = self.create_combined_dataset(downloaded)
        
        print(f"[Auto] Dataset ready at: {combined}", file=sys.stderr)
        return combined


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Download and prepare football datasets")
    parser.add_argument("--output", type=str, default="datasets", help="Output directory")
    parser.add_argument("--kaggle", type=str, help="Kaggle dataset name")
    parser.add_argument("--auto", action="store_true", help="Auto-download from all sources")
    
    args = parser.parse_args()
    
    downloader = DatasetDownloader(args.output)
    
    if args.auto:
        result = downloader.auto_download_and_prepare()
        if result:
            print(f"\n[Success] Dataset ready: {result}", file=sys.stderr)
            print(f"[Next] Run: python -m football_ai.train --dataset {result}", file=sys.stderr)
    elif args.kaggle:
        result = downloader.download_kaggle_dataset(args.kaggle)
        if result:
            print(f"\n[Success] Downloaded: {result}", file=sys.stderr)
    else:
        downloader.download_soccernet()


if __name__ == "__main__":
    main()


