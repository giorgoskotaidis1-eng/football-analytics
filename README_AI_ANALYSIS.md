# 🤖 AI Video Analysis - Quick Start

## ✅ What's Been Added

1. **Python Module**: `football_ai/analysis.py` - YOLOv8 video analysis
2. **API Endpoint**: `POST /api/ai/analyze-video` - Integrated with existing auth
3. **Dependencies**: `requirements.txt` - All Python packages needed

## 🚀 Quick Setup

### 1. Install Python Dependencies

```bash
# Windows
setup-python-ai.bat

# Or manually:
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Test the API

```bash
# Using curl (replace with your auth token)
curl -X POST http://localhost:3000/api/ai/analyze-video \
  -H "Cookie: session=your-session-token" \
  -F "video=@path/to/video.mp4"
```

### 3. Use from Frontend

The existing `VideoUpload` component will work with the new endpoint.

## 📁 File Structure

```
football-analytics-app/
├── football_ai/
│   ├── __init__.py
│   └── analysis.py          # YOLOv8 analysis module
├── requirements.txt          # Python dependencies
├── src/
│   └── app/
│       └── api/
│           └── ai/
│               └── analyze-video/
│                   └── route.ts  # New API endpoint
└── uploads/
    └── videos/              # Temporary video storage
```

## 🔧 How It Works

1. **Client** uploads video to `/api/ai/analyze-video`
2. **API Route** saves video temporarily
3. **Python Script** (`football_ai/analysis.py`) processes video with YOLOv8
4. **Results** returned as JSON with detections per frame
5. **Cleanup** temporary files deleted

## 📊 Response Format

```json
{
  "ok": true,
  "analysis": {
    "duration": 5400.0,
    "fps": 25.0,
    "total_frames": 135000,
    "statistics": {
      "total_player_detections": 50000,
      "total_ball_detections": 10000
    },
    "frames": [
      {
        "frame": 0,
        "timestamp": 0.0,
        "detections": [
          {
            "class": "player",
            "confidence": 0.85,
            "position": { "x": 50.0, "y": 30.0 }
          }
        ]
      }
    ]
  }
}
```

## 🎯 Next Steps

1. **Install dependencies**: Run `setup-python-ai.bat`
2. **Test**: Upload a video through the UI
3. **Customize**: Edit `football_ai/analysis.py` for your needs
4. **Train custom model**: For better accuracy (see AI_VIDEO_ANALYSIS_RECOMMENDATIONS.md)

## ⚠️ Notes

- First run downloads YOLOv8 model (~6MB)
- Processing: ~1-2 seconds per minute of video
- GPU automatically used if available
- Temporary files cleaned up automatically


