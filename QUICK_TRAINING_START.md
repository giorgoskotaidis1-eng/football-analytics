# ⚡ Quick Start: Custom Model Training

## 🚀 **3-Step Process:**

### **Step 1: Prepare Dataset (1-2 weeks)**

**Option A: Use SoccerNet (Easiest)**
```bash
# Download from: https://www.soccer-net.org/
# Then convert:
python -m football_ai.prepare_dataset \
  --coco soccernet/annotations.json \
  --images soccernet/images \
  --output datasets/football_yolo \
  --split
```

**Option B: Annotate Your Videos**
```bash
# 1. Extract frames
extract-frames.bat match.mp4 frames 5

# 2. Install LabelImg
pip install labelImg

# 3. Annotate
labelImg

# 4. Organize into train/val/test folders
```

### **Step 2: Train Model (4-8 hours)**

```bash
# Simple training
train-custom-model.bat

# Or manually:
python -m football_ai.train \
  --dataset datasets/football_yolo \
  --base-model yolov8s.pt \
  --epochs 100 \
  --device 0
```

### **Step 3: Use Trained Model**

```python
# Update football_ai/analysis.py
self.model = YOLO("football_models/football_custom/weights/best.pt")
```

---

## 📊 **Expected Results:**

| Metric | Before | After Training |
|--------|--------|----------------|
| **Player Detection** | 85-92% | **92-96%** ✅ |
| **Ball Detection** | 60-75% | **85-92%** ✅ |
| **Overall** | 70-80% | **90-95%** ✅ |

---

## ✅ **Checklist:**

- [ ] Dataset prepared (1000+ images)
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] GPU available (or use CPU - slower)
- [ ] Run training script
- [ ] Check results in `football_models/`
- [ ] Update API to use trained model

---

## 📚 **Full Guides:**

- **TRAINING_GUIDE.md** - Complete training instructions
- **DATASET_PREPARATION.md** - Dataset preparation details
- **AI_ACCURACY_ANALYSIS.md** - Accuracy expectations

---

**Ready to start? Run `train-custom-model.bat` after preparing your dataset!**


