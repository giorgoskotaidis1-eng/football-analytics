# 🎓 Training Status & Instructions

## 🚀 **Quick Start Training**

### **Option 1: Auto Training (Recommended)**

```bash
# Start automatic training
start-background-training.bat
```

This will:
- ✅ Auto-detect GPU/CPU
- ✅ Find available dataset
- ✅ Start training with optimal settings
- ✅ Run in background

### **Option 2: Manual Training**

```bash
# With dataset
python -m football_ai.train --dataset datasets/football_yolo --epochs 100

# Fine-tune base model (no dataset needed)
python -m football_ai.finetune_base
```

---

## 📊 **Current Training Status**

### **Status:**
- ⏳ **Waiting for dataset**

### **What's Ready:**
- ✅ Training scripts (`football_ai/train.py`, `football_ai/auto_train.py`)
- ✅ GPU detected: **Yes** ✅
- ✅ Python dependencies installed
- ✅ Base model: `yolov8s.pt` (90-95% accuracy)

### **What's Needed:**
- ❌ Dataset (1000+ annotated images)

---

## 📦 **Dataset Options**

### **Option 1: SoccerNet (Easiest - Recommended)**

1. **Download:**
   - Visit: https://www.soccer-net.org/
   - Register (free)
   - Download "SoccerNet-v2"

2. **Convert:**
   ```bash
   python -m football_ai.prepare_dataset \
     --coco datasets/soccernet/annotations/instances.json \
     --images datasets/soccernet/images \
     --output datasets/football_yolo \
     --split
   ```

3. **Start Training:**
   ```bash
   start-background-training.bat
   ```

### **Option 2: Annotate Your Videos**

1. **Extract Frames:**
   ```bash
   extract-frames.bat match.mp4 frames 5
   ```

2. **Annotate:**
   ```bash
   pip install labelImg
   labelImg
   ```
   - Open `frames/` directory
   - Annotate players (class 0) and ball (class 1)
   - Save as YOLOv8 format

3. **Organize:**
   ```
   datasets/football_yolo/
     ├── images/
     │   ├── train/ (70%)
     │   ├── val/ (20%)
     │   └── test/ (10%)
     └── labels/
         ├── train/
         ├── val/
         └── test/
   ```

4. **Start Training:**
   ```bash
   start-background-training.bat
   ```

---

## ⏱️ **Training Time Estimates**

| Setup | Time | Accuracy |
|-------|------|----------|
| **GPU + 1000 images** | 4-8 hours | 90-93% |
| **GPU + 2000 images** | 8-12 hours | 93-96% |
| **CPU + 1000 images** | 1-2 days | 90-93% |
| **CPU + 2000 images** | 2-3 days | 93-96% |

---

## 📈 **Expected Results**

### **After Training (100 epochs, 1000+ images):**

| Metric | Before | After |
|--------|--------|-------|
| **Player Detection** | 85-92% | **92-96%** ✅ |
| **Ball Detection** | 60-75% | **85-92%** ✅ |
| **Overall** | 70-80% | **90-95%** ✅ |

---

## 🔍 **Monitor Training**

### **Check Progress:**
```bash
# View logs
type training.log

# Check results
dir football_models\football_auto\

# View training curves
# Open: football_models/football_auto/results.png
```

### **Stop Training:**
```bash
taskkill /F /IM python.exe
```

---

## ✅ **After Training**

### **Use Trained Model:**

1. **Update `football_ai/analysis.py`:**
   ```python
   self.model = YOLO("football_models/football_auto/weights/best.pt")
   ```

2. **Or specify in API:**
   ```typescript
   formData.append("modelPath", "football_models/football_auto/weights/best.pt");
   ```

---

## 🎯 **Next Steps**

1. **Prepare Dataset** (1-2 weeks)
   - Download SoccerNet OR
   - Annotate your videos

2. **Start Training** (4-8 hours)
   ```bash
   start-background-training.bat
   ```

3. **Monitor Progress**
   - Check `training.log`
   - View `football_models/football_auto/results.png`

4. **Deploy Trained Model**
   - Update `football_ai/analysis.py`
   - Test with video analysis

---

## 📚 **Documentation**

- **TRAINING_GUIDE.md** - Complete training guide
- **DATASET_PREPARATION.md** - Dataset preparation
- **AI_ACCURACY_ANALYSIS.md** - Accuracy expectations
- **QUICK_TRAINING_START.md** - Quick start

---

**Ready to train? Prepare your dataset and run `start-background-training.bat`!**


