# 🐍 Python AI Analysis Setup

## 📦 Installation

### 1. Install Python Dependencies

```bash
# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Verify Installation

```bash
python -c "import torch; import ultralytics; print('✅ All dependencies installed')"
```

## 🚀 Usage

### API Endpoint

**POST** `/api/ai/analyze-video`

**Authentication:** Required (uses existing auth system)

**Request:**
- FormData with:
  - `video`: File (video file)
  - `videoUrl`: string (optional, URL to video)
  - `modelPath`: string (optional, path to custom YOLOv8 model)

**Response:**
```json
{
  "ok": true,
  "analysis": {
    "video_path": "...",
    "duration": 5400.0,
    "fps": 25.0,
    "total_frames": 135000,
    "processed_frames": 135000,
    "width": 1920,
    "height": 1080,
    "statistics": {
      "total_player_detections": 50000,
      "total_ball_detections": 10000,
      "avg_players_per_frame": 22.5
    },
    "frames": [
      {
        "frame": 0,
        "timestamp": 0.0,
        "detections": [
          {
            "class": "player",
            "class_id": 0,
            "confidence": 0.85,
            "bbox": { "x1": 100, "y1": 200, "x2": 150, "y2": 250 },
            "position": { "x": 50.0, "y": 30.0 }
          }
        ]
      }
    ]
  }
}
```

### Direct Python Usage

```bash
# Analyze video directly
python -m football_ai.analysis path/to/video.mp4

# With custom model
python -m football_ai.analysis path/to/video.mp4 path/to/custom-model.pt
```

## 🔧 Configuration

### Model Selection

- **yolov8n.pt** (default): Fastest, good for real-time
- **yolov8s.pt**: Better accuracy, still fast
- **yolov8m.pt**: Good balance
- **yolov8l.pt**: High accuracy
- **yolov8x.pt**: Best accuracy, slower

To use a different model, download it and pass the path in the API request.

### Performance Tuning

Edit `football_ai/analysis.py`:

```python
# Process every Nth frame (1 = every frame, 5 = every 5th frame)
frame_skip = 1  # Change this for faster processing
```

## 📝 Notes

- First run will download YOLOv8 model (~6MB for yolov8n.pt)
- Processing time: ~1-2 seconds per minute of video (depends on hardware)
- GPU acceleration: Automatically used if CUDA is available
- Memory: ~2-4GB RAM required for processing

## 🐛 Troubleshooting

### Python not found
- Ensure Python 3.8+ is installed
- On Windows, use `python` or `py`
- On Linux/Mac, use `python3`

### CUDA/GPU issues
- CPU mode works fine (slower)
- For GPU: Install PyTorch with CUDA support

### Model download fails
- Check internet connection
- YOLOv8 will download model on first use
- Model saved to: `~/.ultralytics/weights/`


