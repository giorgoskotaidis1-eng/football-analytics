"""
Train Custom YOLOv8 Model for Football Video Analysis
"""

import os
import sys
from pathlib import Path
from ultralytics import YOLO
import yaml


def create_dataset_config(dataset_path: str, output_path: str = "football_dataset.yaml"):
    """
    Create YOLOv8 dataset configuration file
    
    Args:
        dataset_path: Path to dataset directory
        output_path: Output YAML file path
    """
    config = {
        "path": str(Path(dataset_path).absolute()),
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "nc": 3,  # Number of classes
        "names": {
            0: "player",
            1: "ball",
            2: "goalkeeper"
        }
    }
    
    with open(output_path, "w") as f:
        yaml.dump(config, f, default_flow_style=False)
    
    print(f"[Train] Created dataset config: {output_path}")
    return output_path


def train_model(
    base_model: str = "yolov8s.pt",
    dataset_config: str = "football_dataset.yaml",
    epochs: int = 100,
    imgsz: int = 640,
    batch: int = 16,
    device: str = "0",  # "0" for GPU, "cpu" for CPU
    project: str = "football_models",
    name: str = "football_yolov8s"
):
    """
    Train custom YOLOv8 model for football analysis
    
    Args:
        base_model: Base YOLOv8 model to fine-tune (yolov8n.pt, yolov8s.pt, etc.)
        dataset_config: Path to dataset YAML config
        epochs: Number of training epochs
        imgsz: Image size for training
        batch: Batch size
        device: Device to use ("0" for GPU, "cpu" for CPU)
        project: Project directory name
        name: Experiment name
    """
    print(f"[Train] Starting training...")
    print(f"[Train] Base model: {base_model}")
    print(f"[Train] Dataset: {dataset_config}")
    print(f"[Train] Epochs: {epochs}")
    print(f"[Train] Image size: {imgsz}")
    print(f"[Train] Batch size: {batch}")
    print(f"[Train] Device: {device}")
    
    # Load base model
    model = YOLO(base_model)
    
    # Train the model
    results = model.train(
        data=dataset_config,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        device=device,
        project=project,
        name=name,
        patience=20,  # Early stopping patience
        save=True,
        plots=True,
        val=True,
    )
    
    print(f"[Train] Training complete!")
    print(f"[Train] Best model saved to: {project}/{name}/weights/best.pt")
    
    return results


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Train custom YOLOv8 model for football analysis")
    parser.add_argument("--dataset", type=str, required=True, help="Path to dataset directory")
    parser.add_argument("--base-model", type=str, default="yolov8s.pt", help="Base model (yolov8n.pt, yolov8s.pt, etc.)")
    parser.add_argument("--epochs", type=int, default=100, help="Number of epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--batch", type=int, default=16, help="Batch size")
    parser.add_argument("--device", type=str, default="0", help="Device (0 for GPU, cpu for CPU)")
    parser.add_argument("--name", type=str, default="football_yolov8s", help="Experiment name")
    
    args = parser.parse_args()
    
    # Create dataset config
    dataset_config = create_dataset_config(args.dataset)
    
    # Train model
    train_model(
        base_model=args.base_model,
        dataset_config=dataset_config,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device,
        name=args.name
    )


if __name__ == "__main__":
    main()

