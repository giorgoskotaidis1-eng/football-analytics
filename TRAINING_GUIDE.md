# 🎓 Custom YOLOv8 Training Guide - Step by Step

## 🎯 **Goal: Train Custom Model για 95-98% Accuracy**

---

## 📋 **Step 1: Prepare Dataset (1-2 weeks)**

### **Option A: Use SoccerNet Dataset (Recommended)**

```bash
# 1. Download SoccerNet dataset
# Visit: https://www.soccer-net.org/
# Register and download annotations

# 2. Convert to YOLOv8 format
python -m football_ai.prepare_dataset \
  --coco path/to/soccernet/annotations.json \
  --images path/to/soccernet/images \
  --output datasets/football_yolo \
  --split
```

### **Option B: Annotate Your Own Videos**

**Tools:**
- **LabelImg** (free, easy): https://github.com/HumanSignal/labelImg
- **CVAT** (professional): https://cvat.org/
- **Roboflow** (cloud-based): https://roboflow.com/

**Annotation Process:**
1. Extract frames from videos (every 5-10 seconds)
2. Annotate with 3 classes:
   - `player` (class 0)
   - `ball` (class 1)
   - `goalkeeper` (class 2) - optional

**Minimum Dataset Size:**
- **Training:** 500-1000 images (minimum)
- **Validation:** 100-200 images
- **Test:** 50-100 images
- **Ideal:** 2000+ images for 95%+ accuracy

---

## 🚀 **Step 2: Install Training Dependencies**

```bash
# Activate virtual environment
venv\Scripts\activate  # Windows
# or
source venv/bin/activate  # Linux/Mac

# Install additional training dependencies
pip install pyyaml matplotlib seaborn
```

---

## 🏋️ **Step 3: Train the Model**

### **Quick Start (Basic Training)**

```bash
python -m football_ai.train \
  --dataset datasets/football_yolo \
  --base-model yolov8s.pt \
  --epochs 100 \
  --batch 16 \
  --device 0  # Use GPU (or "cpu" for CPU)
```

### **Advanced Training (Better Results)**

```bash
python -m football_ai.train \
  --dataset datasets/football_yolo \
  --base-model yolov8m.pt \
  --epochs 200 \
  --imgsz 1280 \
  --batch 8 \
  --device 0 \
  --name football_yolov8m_custom
```

### **Training Parameters Explained:**

| Parameter | Value | Effect |
|-----------|-------|--------|
| `--base-model` | yolov8s.pt | Starting point (s=small, m=medium, l=large) |
| `--epochs` | 100-200 | More epochs = better (but slower) |
| `--imgsz` | 640-1280 | Larger = better accuracy (slower) |
| `--batch` | 8-32 | Depends on GPU memory |
| `--device` | 0 or cpu | GPU recommended |

---

## 📊 **Step 4: Monitor Training**

Training creates:
- `football_models/football_yolov8s/weights/best.pt` - Best model
- `football_models/football_yolov8s/results.png` - Training curves
- `football_models/football_yolov8s/confusion_matrix.png` - Accuracy metrics

**Check Results:**
```bash
# View training results
# Open: football_models/football_yolov8s/results.png
```

**Expected Metrics:**
- **mAP50:** >0.90 (90%+ accuracy)
- **mAP50-95:** >0.70 (70%+ accuracy)
- **Precision:** >0.85
- **Recall:** >0.85

---

## ✅ **Step 5: Use Trained Model**

### **Update API to Use Custom Model**

```typescript
// In VideoUpload component or API route
const formData = new FormData();
formData.append("video", videoFile);
formData.append("modelPath", "football_models/football_yolov8s/weights/best.pt");

const response = await fetch("/api/ai/analyze-video", {
  method: "POST",
  body: formData,
});
```

### **Or Set as Default**

Edit `football_ai/analysis.py`:
```python
# Change default model
self.model = YOLO("football_models/football_yolov8s/weights/best.pt")
```

---

## 🎯 **Expected Results:**

### **After Training (100 epochs, 1000+ images):**

| Metric | Before | After Training |
|--------|--------|----------------|
| **Player Detection** | 85-92% | **92-96%** ✅ |
| **Ball Detection** | 60-75% | **85-92%** ✅ |
| **Overall Accuracy** | 70-80% | **90-95%** ✅ |

### **After Extended Training (200 epochs, 2000+ images):**

| Metric | Result |
|--------|--------|
| **Player Detection** | **94-97%** ✅ |
| **Ball Detection** | **90-95%** ✅ |
| **Overall Accuracy** | **93-96%** ✅ |

---

## 💻 **Complete Training Script**

Create `train-custom-model.bat`:

```batch
@echo off
echo Training Custom YOLOv8 Model for Football Analysis...
echo.

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Train model
python -m football_ai.train ^
  --dataset datasets/football_yolo ^
  --base-model yolov8s.pt ^
  --epochs 100 ^
  --batch 16 ^
  --device 0 ^
  --name football_custom

echo.
echo Training complete!
echo Best model: football_models/football_custom/weights/best.pt
pause
```

---

## 📚 **Dataset Sources:**

### **1. SoccerNet (Best Option)**
- **URL:** https://www.soccer-net.org/
- **Size:** 500+ matches
- **Format:** COCO JSON
- **Cost:** Free (research use)

### **2. Custom Annotation**
- **Tool:** LabelImg
- **Time:** ~2-3 hours per 100 images
- **Quality:** Full control

### **3. Roboflow (Easy Option)**
- **URL:** https://roboflow.com/
- **Features:** Pre-annotated datasets, augmentation
- **Cost:** Free tier available

---

## ⚙️ **Training Tips:**

### **1. Data Augmentation (Automatic)**
YOLOv8 automatically applies:
- Rotation
- Scaling
- Color jitter
- Mosaic augmentation

### **2. Learning Rate**
- Default: Auto (works well)
- Custom: `lr0=0.01` in training config

### **3. Early Stopping**
- Patience: 20 epochs
- Stops if no improvement

### **4. Multi-GPU Training**
```python
device = "0,1"  # Use GPU 0 and 1
```

---

## 🐛 **Troubleshooting:**

### **Out of Memory Error**
```bash
# Reduce batch size
--batch 8  # Instead of 16

# Or reduce image size
--imgsz 512  # Instead of 640
```

### **Slow Training**
```bash
# Use smaller model
--base-model yolov8n.pt

# Or reduce epochs
--epochs 50
```

### **Low Accuracy**
- Add more training data (1000+ images)
- Increase epochs (200+)
- Use larger model (yolov8m.pt)
- Check annotation quality

---

## 📈 **Training Timeline:**

| Phase | Time | Result |
|-------|------|--------|
| **Dataset Prep** | 1-2 weeks | 1000+ annotated images |
| **Initial Training** | 4-8 hours | 90-93% accuracy |
| **Fine-tuning** | 2-4 hours | 93-96% accuracy |
| **Total** | **2-3 weeks** | **95-98% accuracy** ✅ |

---

## ✅ **Quick Start Checklist:**

- [ ] Install Python dependencies (`pip install -r requirements.txt`)
- [ ] Download/prepare dataset (1000+ images)
- [ ] Convert to YOLOv8 format
- [ ] Split into train/val/test
- [ ] Run training script
- [ ] Monitor training progress
- [ ] Test trained model
- [ ] Deploy to production

---

## 🚀 **Ready to Start?**

1. **Prepare dataset** (1-2 weeks)
2. **Run training** (4-8 hours)
3. **Test results** (30 minutes)
4. **Deploy** (update API)

**Θέλεις να ξεκινήσουμε με dataset preparation;**


