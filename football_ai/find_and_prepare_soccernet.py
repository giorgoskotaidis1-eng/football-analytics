"""
Find and prepare SoccerNet dataset automatically
"""

import os
import sys
import zipfile
import tarfile
from pathlib import Path
import subprocess
from typing import Optional, Dict
import shutil


def find_soccernet_file() -> Optional[Path]:
    """Find SoccerNet archive file"""
    current_dir = Path(".")
    datasets_dir = Path("datasets")
    
    # Search patterns
    patterns = [
        "soccernet-*.zip",
        "soccernet-*.tar",
        "soccernet-*.tar.gz",
        "soccernet-*.7z",
        "SoccerNet-*.zip",
        "SoccerNet-*.tar",
        "SoccerNet-*.tar.gz",
        "*soccernet*.zip",
        "*soccernet*.7z",
        "*soccernet*.rar",
        "soccernet-0.1.62.tar.gz",  # Exact filename
        "soccernet-0.1.*.tar.gz",   # Pattern with version
    ]
    
    search_dirs = [current_dir, datasets_dir]
    if datasets_dir.exists():
        search_dirs.append(datasets_dir)
    
    for search_dir in search_dirs:
        # Search with patterns
        for pattern in patterns:
            for file in search_dir.glob(pattern):
                print(f"[Find] Found SoccerNet file: {file}", file=sys.stderr)
                return file
        
        # Also check all files for soccernet in name (only archive files)
        archive_extensions = ['.zip', '.tar', '.gz', '.7z', '.rar']
        for file in search_dir.iterdir():
            if file.is_file() and "soccernet" in file.name.lower():
                # Check if it's an archive file
                if any(file.name.lower().endswith(ext) for ext in archive_extensions) or '.tar.gz' in file.name.lower():
                    print(f"[Find] Found SoccerNet file: {file}", file=sys.stderr)
                    return file
    
    return None


def extract_soccernet(archive_path: Path, output_dir: Path, password: str = "s0cc3rn3t") -> bool:
    """Extract SoccerNet archive (with password support)"""
    print(f"[Extract] Extracting {archive_path.name}...", file=sys.stderr)
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        if archive_path.suffix == ".zip":
            # Try with password first
            try:
                with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                    zip_ref.setpassword(password.encode('utf-8'))
                    zip_ref.extractall(output_dir)
                    print(f"[Extract] Extracted with password", file=sys.stderr)
            except RuntimeError:
                # If password fails, try without password
                try:
                    with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                        zip_ref.extractall(output_dir)
                    print(f"[Extract] Extracted without password", file=sys.stderr)
                except Exception as e:
                    print(f"[Extract] Error extracting ZIP: {e}", file=sys.stderr)
                    return False
        elif archive_path.suffix == ".tar" or archive_path.name.endswith(".tar.gz"):
            if archive_path.name.endswith(".tar.gz"):
                mode = "r:gz"
            else:
                mode = "r:"
            try:
                with tarfile.open(archive_path, mode) as tar_ref:
                    tar_ref.extractall(output_dir)
            except Exception as e:
                # If extraction fails, might be password protected
                # Try with 7z if available (supports password-protected tar.gz)
                print(f"[Extract] Standard extraction failed, trying 7z...", file=sys.stderr)
                try:
                    subprocess.run(
                        ["7z", "x", str(archive_path), f"-p{password}", f"-o{output_dir}", "-y"],
                        check=True,
                        capture_output=True
                    )
                    print(f"[Extract] Extracted with 7z and password", file=sys.stderr)
                except (subprocess.CalledProcessError, FileNotFoundError):
                    print(f"[Extract] Error: {e}", file=sys.stderr)
                    print(f"[Extract] Note: tar.gz files usually don't support passwords", file=sys.stderr)
                    print(f"[Extract] If file is password-protected, it might be a different format", file=sys.stderr)
                    return False
        elif archive_path.suffix == ".7z" or archive_path.name.endswith(".7z"):
            # Use 7z command line tool if available
            try:
                subprocess.run(
                    ["7z", "x", str(archive_path), f"-p{password}", f"-o{output_dir}", "-y"],
                    check=True,
                    capture_output=True
                )
                print(f"[Extract] Extracted 7z with password", file=sys.stderr)
            except (subprocess.CalledProcessError, FileNotFoundError):
                print(f"[Extract] 7z not available, trying Python zipfile...", file=sys.stderr)
                # Try as zip
                try:
                    with zipfile.ZipFile(archive_path, 'r') as zip_ref:
                        zip_ref.setpassword(password.encode('utf-8'))
                        zip_ref.extractall(output_dir)
                except Exception as e:
                    print(f"[Extract] Error: {e}", file=sys.stderr)
                    return False
        else:
            print(f"[Extract] Unknown archive format: {archive_path.suffix}", file=sys.stderr)
            return False
        
        print(f"[Extract] Extracted to: {output_dir}", file=sys.stderr)
        return True
    except Exception as e:
        print(f"[Extract] Error: {e}", file=sys.stderr)
        return False


def find_soccernet_structure(base_dir: Path) -> Optional[Dict[str, Path]]:
    """Find SoccerNet directory structure"""
    # Common SoccerNet structures
    possible_structures = [
        {
            "annotations": base_dir / "annotations",
            "images": base_dir / "images",
        },
        {
            "annotations": base_dir / "SoccerNet" / "annotations",
            "images": base_dir / "SoccerNet" / "images",
        },
        {
            "annotations": base_dir / "soccernet" / "annotations",
            "images": base_dir / "soccernet" / "images",
        },
    ]
    
    for structure in possible_structures:
        if structure["annotations"].exists() and structure["images"].exists():
            print(f"[Find] Found SoccerNet structure:", file=sys.stderr)
            print(f"  Annotations: {structure['annotations']}", file=sys.stderr)
            print(f"  Images: {structure['images']}", file=sys.stderr)
            return structure
    
    return None


def prepare_soccernet_auto() -> Optional[str]:
    """Automatically find, extract, and prepare SoccerNet"""
    print("=" * 60, file=sys.stderr)
    print("Automatic SoccerNet Preparation", file=sys.stderr)
    print("=" * 60, file=sys.stderr)
    print(file=sys.stderr)
    
    # Step 1: Find archive file
    archive_file = find_soccernet_file()
    if not archive_file:
        print("[Auto] SoccerNet archive not found!", file=sys.stderr)
        print("[Auto] Please ensure the file is named:", file=sys.stderr)
        print("  - soccernet-*.zip", file=sys.stderr)
        print("  - soccernet-*.tar", file=sys.stderr)
        print("  - soccernet-*.tar.gz", file=sys.stderr)
        print(file=sys.stderr)
        print("[Auto] And is in the current directory or datasets folder", file=sys.stderr)
        return None
    
    # Step 2: Check if already extracted
    output_dir = Path("datasets/soccernet")
    structure = find_soccernet_structure(output_dir)
    
    if not structure:
        # Step 3: Extract (with password)
        if not extract_soccernet(archive_file, output_dir, password="s0cc3rn3t"):
            return None
        
        # Step 4: Find structure after extraction
        structure = find_soccernet_structure(output_dir)
        if not structure:
            # Try to find in subdirectories
            for subdir in output_dir.iterdir():
                if subdir.is_dir():
                    structure = find_soccernet_structure(subdir)
                    if structure:
                        # Move to main directory
                        print(f"[Auto] Moving structure to main directory...", file=sys.stderr)
                        for key, path in structure.items():
                            dest = output_dir / key
                            if path != dest:
                                shutil.move(str(path), str(dest))
                        structure = find_soccernet_structure(output_dir)
                        break
    
    if not structure:
        print("[Auto] Could not find SoccerNet structure after extraction", file=sys.stderr)
        print("[Auto] Please check the extracted files manually", file=sys.stderr)
        return None
    
    # Step 5: Prepare dataset
    print(file=sys.stderr)
    print("[Auto] Preparing dataset for training...", file=sys.stderr)
    
    # Find annotation file
    annotation_file = None
    annotations_dir = structure["annotations"]
    for file in annotations_dir.glob("*.json"):
        if "instance" in file.name.lower() or "annotation" in file.name.lower():
            annotation_file = file
            break
    
    if not annotation_file:
        # Try to find any JSON file
        json_files = list(annotations_dir.glob("*.json"))
        if json_files:
            annotation_file = json_files[0]
    
    if not annotation_file:
        print("[Auto] Annotation file not found!", file=sys.stderr)
        print(f"[Auto] Searched in: {annotations_dir}", file=sys.stderr)
        return None
    
    # Run prepare_dataset
    output_yolo = "datasets/football_yolo"
    cmd = [
        sys.executable, "-m", "football_ai.prepare_dataset",
        "--coco", str(annotation_file),
        "--images", str(structure["images"]),
        "--output", output_yolo,
        "--split"
    ]
    
    print(f"[Auto] Running: {' '.join(cmd)}", file=sys.stderr)
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(result.stdout, file=sys.stderr)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        
        print(file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print("SoccerNet Preparation Complete!", file=sys.stderr)
        print("=" * 60, file=sys.stderr)
        print(f"[Auto] Dataset ready: {output_yolo}", file=sys.stderr)
        return output_yolo
    except subprocess.CalledProcessError as e:
        print(f"[Auto] Error preparing dataset: {e}", file=sys.stderr)
        print(e.stderr, file=sys.stderr)
        return None


if __name__ == "__main__":
    result = prepare_soccernet_auto()
    if result:
        print(file=sys.stderr)
        print("[Success] Dataset ready for training!", file=sys.stderr)
        print(f"[Next] Run: start-background-training.bat", file=sys.stderr)
        sys.exit(0)
    else:
        print(file=sys.stderr)
        print("[Error] Failed to prepare dataset", file=sys.stderr)
        sys.exit(1)

