# 📥 Complete Dataset Download & Preparation Guide

## 🎯 **Goal: Automatic Dataset Download & Training**

---

## 🚀 **Quick Start (Automatic)**

```bash
# 1. Auto-download and prepare
auto-download-datasets.bat

# 2. Start training
start-background-training.bat
```

---

## 📦 **Dataset Sources**

### **1. SoccerNet (Best Quality - Recommended)**

**Download:**
1. Visit: https://www.soccer-net.org/
2. Register (free)
3. Download "SoccerNet-v2"
4. Extract to: `datasets/soccernet/`

**Auto-Prepare:**
```bash
python -m football_ai.prepare_all_datasets
```

**Manual Prepare:**
```bash
python -m football_ai.prepare_dataset \
  --coco datasets/soccernet/annotations/instances.json \
  --images datasets/soccernet/images \
  --output datasets/football_yolo \
  --split
```

---

### **2. Kaggle Datasets**

**Search for:**
- "football player detection"
- "soccer object detection"
- "football match images"

**Download:**
```bash
# Install Kaggle CLI
pip install kaggle

# Set up credentials (one time)
# Download kaggle.json from https://www.kaggle.com/account
# Place in: C:\Users\<username>\.kaggle\kaggle.json

# Download dataset
python -m football_ai.download_datasets --kaggle <dataset-name>
```

**Popular Datasets:**
- `football-player-detection`
- `soccer-player-detection`
- `football-object-detection`

---

### **3. Roboflow**

**Visit:** https://roboflow.com/datasets

**Search for:**
- "football"
- "soccer"
- "player detection"

**Download:**
1. Find public dataset
2. Export as YOLOv8 format
3. Download ZIP
4. Extract to: `datasets/roboflow/`

---

## 🔄 **Automatic Preparation**

### **Option 1: Auto-Download (Attempts all sources)**

```bash
auto-download-datasets.bat
```

This will:
- ✅ Check for SoccerNet
- ✅ Try Kaggle datasets
- ✅ Combine all found datasets
- ✅ Prepare for training

### **Option 2: Manual Preparation**

```bash
python -m football_ai.prepare_all_datasets
```

This will:
- ✅ Find all downloaded datasets
- ✅ Convert to YOLOv8 format
- ✅ Split into train/val/test
- ✅ Combine if multiple

---

## 📊 **Dataset Structure**

After preparation:

```
datasets/football_yolo/
├── images/
│   ├── train/ (70% - 700+ images)
│   ├── val/ (20% - 200+ images)
│   └── test/ (10% - 100+ images)
└── labels/
    ├── train/
    ├── val/
    └── test/
```

**Classes:**
- `0: player`
- `1: ball`
- `2: goalkeeper` (optional)

---

## ✅ **Checklist**

- [ ] SoccerNet downloaded (or Kaggle dataset)
- [ ] Dataset extracted to `datasets/`
- [ ] Run `auto-download-datasets.bat`
- [ ] Verify dataset structure
- [ ] Start training: `start-background-training.bat`

---

## 🎯 **Expected Results**

| Dataset Size | Training Time (GPU) | Accuracy |
|--------------|---------------------|----------|
| 500 images | 2-4 hours | 85-90% |
| 1000 images | 4-8 hours | 90-93% |
| 2000+ images | 8-12 hours | 93-96% |

---

## 🐛 **Troubleshooting**

### **No datasets found:**
1. Download SoccerNet manually
2. Or use Kaggle datasets
3. Run `auto-download-datasets.bat` again

### **Kaggle authentication error:**
1. Download `kaggle.json` from https://www.kaggle.com/account
2. Place in: `C:\Users\<username>\.kaggle\kaggle.json`

### **Dataset format error:**
1. Check dataset structure
2. Ensure images and labels match
3. Verify YOLOv8 format

---

## 📚 **Next Steps**

1. **Download datasets** (1-2 days)
2. **Auto-prepare** (30 minutes)
3. **Start training** (4-8 hours)
4. **Deploy model** (update `football_ai/analysis.py`)

---

**Ready? Run `auto-download-datasets.bat` to start!**


