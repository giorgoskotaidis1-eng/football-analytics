# 📦 Dataset Preparation Guide

## 🎯 **Goal: Create 1000+ Annotated Images**

---

## 📋 **Method 1: Use SoccerNet Dataset (Easiest)**

### **Step 1: Download SoccerNet**

```bash
# Visit: https://www.soccer-net.org/
# Register for free
# Download "SoccerNet-v2" dataset
# Contains: 500+ matches with annotations
```

### **Step 2: Convert to YOLOv8 Format**

```bash
python -m football_ai.prepare_dataset \
  --coco path/to/soccernet/annotations/instances.json \
  --images path/to/soccernet/images \
  --output datasets/football_yolo \
  --split
```

**Result:** Ready-to-use dataset in YOLOv8 format ✅

---

## 📋 **Method 2: Annotate Your Own Videos (Best Quality)**

### **Step 1: Install LabelImg**

```bash
# Install LabelImg
pip install labelImg

# Or download from: https://github.com/HumanSignal/labelImg/releases
```

### **Step 2: Extract Frames from Videos**

```python
# extract_frames.py
import cv2
from pathlib import Path

def extract_frames(video_path: str, output_dir: str, interval: int = 5):
    """Extract frames every N seconds"""
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = int(fps * interval)
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    frame_count = 0
    saved_count = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        
        if frame_count % frame_interval == 0:
            cv2.imwrite(str(output_path / f"frame_{saved_count:06d}.jpg"), frame)
            saved_count += 1
        
        frame_count += 1
    
    cap.release()
    print(f"Extracted {saved_count} frames")

# Usage
extract_frames("match_video.mp4", "frames", interval=5)
```

### **Step 3: Annotate with LabelImg**

1. **Open LabelImg:**
   ```bash
   labelImg
   ```

2. **Set Classes:**
   - `player` (class 0)
   - `ball` (class 1)
   - `goalkeeper` (class 2) - optional

3. **Annotate:**
   - Open image directory
   - Draw bounding boxes around players/ball
   - Save as YOLOv8 format (not PascalVOC)
   - Press `W` to create box, `D` for next image

4. **Tips:**
   - Annotate clearly visible players/ball
   - Skip blurry or unclear frames
   - Be consistent with box sizes
   - Aim for 1000+ images

### **Step 4: Organize Dataset**

```
datasets/
└── football_yolo/
    ├── images/
    │   ├── train/
    │   ├── val/
    │   └── test/
    └── labels/
        ├── train/
        ├── val/
        └── test/
```

**Split Ratio:**
- Train: 70% (700+ images)
- Val: 20% (200+ images)
- Test: 10% (100+ images)

---

## 📋 **Method 3: Use Roboflow (Cloud-Based)**

### **Step 1: Upload Videos**

1. Go to https://roboflow.com/
2. Create free account
3. Upload videos or images
4. Use auto-annotation (AI-assisted)

### **Step 2: Export YOLOv8 Format**

1. Annotate/verify annotations
2. Export → YOLOv8 format
3. Download dataset
4. Ready to use! ✅

---

## 📊 **Dataset Requirements:**

### **Minimum (Basic Model):**
- **Images:** 500-1000
- **Classes:** 2 (player, ball)
- **Quality:** Good visibility

### **Recommended (95%+ Accuracy):**
- **Images:** 2000-5000
- **Classes:** 3 (player, ball, goalkeeper)
- **Quality:** High, diverse angles
- **Variety:** Different stadiums, lighting, camera angles

### **Ideal (98%+ Accuracy):**
- **Images:** 5000+
- **Classes:** 3+
- **Quality:** Professional
- **Augmentation:** Automatic (YOLOv8 handles this)

---

## ⚡ **Quick Start Script**

Create `prepare-dataset.bat`:

```batch
@echo off
echo Preparing Dataset for Training...
echo.

REM Extract frames from videos
python extract_frames.py match1.mp4 frames/ 5
python extract_frames.py match2.mp4 frames/ 5

echo.
echo Frames extracted! Now annotate with LabelImg:
echo 1. Open LabelImg
echo 2. Open frames/ directory
echo 3. Annotate players and ball
echo 4. Save as YOLOv8 format
echo.
pause
```

---

## ✅ **Dataset Checklist:**

- [ ] 1000+ images extracted
- [ ] All images annotated
- [ ] YOLOv8 format labels (.txt files)
- [ ] Split into train/val/test
- [ ] Dataset structure correct
- [ ] Ready for training!

---

## 🎯 **Next Step:**

Once dataset is ready, run:
```bash
train-custom-model.bat
```

**Θέλεις να δημιουργήσω το extract_frames.py script;**


