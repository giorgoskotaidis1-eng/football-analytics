# ✅ SoccerNet Installed - Ready to Train!

## 🎉 **SoccerNet OK!**

Το SoccerNet είναι installed! Μπορούμε να ξεκινήσουμε το training!

---

## 🚀 **Quick Start:**

### **Option 1: All at Once (Recommended)**

**Double-click:**
```
start-training-complete.bat
```

**Or run:**
```powershell
venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000
```

**Time: 6-12 hours total**

---

### **Option 2: Step by Step**

#### **STEP 1: Download Videos**
```powershell
venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --download-videos --max-games 10
```
**Time: 1-3 hours**

#### **STEP 2: Process Dataset**
```powershell
venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --process --max-games 10 --frames-per-game 1000
```
**Time: 1-2 hours**

#### **STEP 3: Train Model**
```powershell
venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --train
```
**Time: 4-8 hours (CPU) or 1-2 hours (GPU)**

---

## 📊 **What Will Happen:**

1. **Download Videos** → `datasets/soccernet_data/*.mkv`
2. **Extract Frames** → `datasets/football_yolo/images/`
3. **Create Labels** → `datasets/football_yolo/labels/`
4. **Train Model** → `football_models/football_soccernet/weights/best.pt`

---

## ✅ **After Training:**

Το trained model θα είναι:
```
football_models/football_soccernet/weights/best.pt
```

Και το `analysis.py` θα το χρησιμοποιήσει **αυτόματα**!

---

## 🎯 **Ready to Start!**

**Run this:**
```powershell
venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000
```

**Or double-click:**
```
start-training-complete.bat
```

---

**Let's train!** 🚀

