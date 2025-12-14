# ✅ Install Everything First - Complete Setup

## ⚠️ **Συγγνώμη!** 

Έπρεπε να ελέγξω πρώτα αν όλα τα packages είναι installed. Ας τα εγκαταστήσουμε όλα τώρα!

---

## 🚀 **Quick Install (Copy-Paste):**

### **Option 1: Batch File (CMD)**
```cmd
install-all-dependencies.bat
```

### **Option 2: PowerShell**
```powershell
.\install-all-dependencies.ps1
```

### **Option 3: Manual (Copy-Paste)**
```powershell
.\venv\Scripts\python.exe -m pip install -r requirements.txt
.\venv\Scripts\python.exe -m pip install SoccerNet
```

---

## 📦 **What Will Be Installed:**

- ✅ **PyTorch** - Deep learning framework
- ✅ **Ultralytics** - YOLOv8
- ✅ **OpenCV** - Video/image processing
- ✅ **NumPy** - Numerical computing
- ✅ **Pandas** - Data processing
- ✅ **PyYAML** - Config files
- ✅ **Matplotlib** - Plotting
- ✅ **Seaborn** - Statistics plotting
- ✅ **tqdm** - Progress bars
- ✅ **SoccerNet** - SoccerNet dataset package ⭐

---

## ✅ **After Installation:**

Verify everything is installed:

```powershell
.\venv\Scripts\python.exe -c "from SoccerNet.Downloader import SoccerNetDownloader; print('SoccerNet: OK')"
```

---

## 🎯 **Then Start Training:**

After installation, run:

```powershell
.\venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --download-videos --max-games 10
```

---

## 📝 **Summary:**

1. **Install dependencies:** `install-all-dependencies.bat`
2. **Verify:** Check SoccerNet import
3. **Start training:** Download videos first

**Sorry for the confusion! Let's install everything first!** 🚀

