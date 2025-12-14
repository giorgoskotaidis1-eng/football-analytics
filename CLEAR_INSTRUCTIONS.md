# ✅ Clear Instructions - Install SoccerNet

## ⚠️ **IMPORTANT: Run Commands ONE AT A TIME!**

Μην τα γράφεις όλα μαζί! Κάνε copy-paste **ένα-ένα**!

---

## 🚀 **Method 1: Batch File (Easiest)**

**Double-click:**
```
install-soccernet-only.bat
```

---

## 🚀 **Method 2: Manual (Step by Step)**

### **STEP 1: Install SoccerNet**
```powershell
venv\Scripts\python.exe -m pip install SoccerNet
```

**Wait for it to finish!** (μπορεί να πάρει 1-2 λεπτά)

### **STEP 2: Verify Installation**
```powershell
venv\Scripts\python.exe -c "from SoccerNet.Downloader import SoccerNetDownloader; print('SoccerNet: OK')"
```

**Should print:** `SoccerNet: OK`

---

## ⚠️ **Common Mistakes:**

### ❌ **WRONG (Don't do this):**
```powershell
venv\Scripts\python.exe -m pip install SoccerNetvenv\Scripts\python.exe -c "..."
```
(Δύο commands μαζί - δεν δουλεύει!)

### ✅ **CORRECT:**
```powershell
venv\Scripts\python.exe -m pip install SoccerNet
```
(Wait...)
```powershell
venv\Scripts\python.exe -c "from SoccerNet.Downloader import SoccerNetDownloader; print('SoccerNet: OK')"
```

---

## 📝 **Quick Copy-Paste:**

**Copy this FIRST:**
```powershell
venv\Scripts\python.exe -m pip install SoccerNet
```

**Press Enter, wait for it to finish, then copy this:**
```powershell
venv\Scripts\python.exe -c "from SoccerNet.Downloader import SoccerNetDownloader; print('SoccerNet: OK')"
```

---

## ✅ **After Installation:**

Once you see "SoccerNet: OK", you can start training:

```powershell
venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --download-videos --max-games 10
```

---

**Run commands ONE AT A TIME!** 🚀

