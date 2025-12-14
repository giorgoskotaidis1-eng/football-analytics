# ⚠️ Disk Space Issue - "No space left on device"

## 🔴 **Problem:**

Το disk σου είναι **γεμάτο**! Αυτό προκαλεί:
- ❌ Conversion script σταμάτησε
- ❌ Training script δεν μπορεί να download fonts
- ❌ Δεν μπορεί να σώσει files

---

## 💾 **What Happened:**

### **1. Conversion Script:**
```
OSError: [Errno 28] No space left on device
```
- Το script προσπαθούσε να σώσει images
- Δεν είχε χώρο → crash

### **2. Training Script:**
```
Download failure for https://ultralytics.com/assets/Arial.ttf
Curl return value 23
```
- Προσπαθούσε να download font
- Δεν είχε χώρο → crash

---

## 🔍 **Check Disk Space:**

```powershell
# Check free space on C: drive
Get-PSDrive C | Select-Object Used,Free
```

**Or:**
```powershell
# Check specific folder size
Get-ChildItem "datasets" -Recurse | Measure-Object -Property Length -Sum
```

---

## 🚀 **Solutions:**

### **Solution 1: Clean Up Temporary Files** ⭐

```powershell
# Clean Python cache
Remove-Item -Recurse -Force __pycache__, *.pyc, .pytest_cache -ErrorAction SilentlyContinue

# Clean Ultralytics cache
Remove-Item -Recurse -Force "$env:APPDATA\Ultralytics" -ErrorAction SilentlyContinue

# Clean pip cache
pip cache purge
```

### **Solution 2: Move Datasets to Another Drive**

Αν έχεις άλλο drive (D:, E:, etc.):

```powershell
# Move datasets folder
Move-Item "datasets" "D:\football_datasets"
```

**Then update paths in scripts:**
- `ai_pipeline/vision/soccernet_to_yolo_all.py` → Change `SOCCERNET_ROOT`
- `ai_pipeline/vision/data.yaml` → Change `path`

### **Solution 3: Delete Unnecessary Files**

**Check what's taking space:**
```powershell
# Check largest folders
Get-ChildItem -Directory | ForEach-Object {
    $size = (Get-ChildItem $_.FullName -Recurse -ErrorAction SilentlyContinue | 
             Measure-Object -Property Length -Sum).Sum
    [PSCustomObject]@{Folder=$_.Name; SizeGB=[math]::Round($size/1GB, 2)}
} | Sort-Object SizeGB -Descending | Select-Object -First 10
```

**Common space hogs:**
- `node_modules/` (μπορείς να το delete και reinstall)
- `venv/` (αν έχεις backup)
- `datasets/` (αν έχεις backup)
- `runs/` (old training runs)
- `__pycache__/` (Python cache)

### **Solution 4: Use External Drive**

Αν έχεις external drive:
1. Move `datasets/` στο external drive
2. Update paths στα scripts

---

## 📊 **Space Requirements:**

### **What You Need:**

| Item | Size | Can Delete? |
|------|------|-------------|
| **SoccerNet videos** | ~40-320 GB | ✅ After conversion |
| **Converted images** | ~50-100 GB | ⚠️ Needed for training |
| **Training runs** | ~5-10 GB | ✅ Old runs can delete |
| **node_modules** | ~500 MB - 2 GB | ✅ Can reinstall |
| **Python cache** | ~100-500 MB | ✅ Safe to delete |
| **Ultralytics cache** | ~100-500 MB | ✅ Safe to delete |

---

## ✅ **Quick Fix (Recommended):**

### **1. Clean Up:**
```powershell
# Delete Python cache
Get-ChildItem -Path . -Include __pycache__,*.pyc -Recurse -Force | Remove-Item -Force

# Delete old training runs (keep only latest)
Get-ChildItem "runs" -Directory | Where-Object {$_.LastWriteTime -lt (Get-Date).AddDays(-7)} | Remove-Item -Recurse -Force

# Clean pip cache
pip cache purge
```

### **2. Check Space:**
```powershell
Get-PSDrive C | Select-Object Used,Free
```

### **3. If Still Not Enough:**

**Option A: Move datasets**
```powershell
# Move to another drive if available
Move-Item "datasets" "D:\football_datasets"
```

**Option B: Delete converted images (re-convert later)**
```powershell
# Delete converted images (you can re-convert)
Remove-Item -Recurse -Force "datasets\soccernet_yolo\images"
Remove-Item -Recurse -Force "datasets\soccernet_yolo\labels"
```

**Option C: Delete some videos (keep only what you need)**
```powershell
# Keep only videos you need for training
# Delete videos from games you don't need
```

---

## 🎯 **Recommended Action Plan:**

1. **Clean up** (delete cache, old runs)
2. **Check space** - Need at least **50-100 GB free**
3. **If not enough**: Move datasets to another drive
4. **Resume conversion** - It will skip already converted images
5. **Start training** - After conversion is complete

---

## ⚠️ **Important:**

**Before deleting anything:**
- ✅ Backup important data
- ✅ Check what you're deleting
- ✅ Make sure you have space for training (50-100 GB)

---

## 🔧 **After Cleanup:**

### **Resume Conversion:**
```bash
python ai_pipeline/vision/soccernet_to_yolo_all.py
```
- Will skip already converted images ✅
- Will continue from where it stopped ✅

### **Start Training:**
```bash
python ai_pipeline/vision/train_yolo_soccernet.py --epochs 50
```
- Will work after you have space ✅

---

## ✅ **Bottom Line:**

**Problem**: Disk is full (No space left on device)

**Solution**: 
1. Clean up temporary files
2. Free at least 50-100 GB
3. Resume conversion/training

**Quick fix**: Delete cache, old runs, move datasets to another drive if needed.

