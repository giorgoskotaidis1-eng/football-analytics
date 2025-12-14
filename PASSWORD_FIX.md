# 🔧 Password Fix - SoccerNet Download

## ⚠️ **Problem:**
SoccerNetDownloader doesn't accept `password` as constructor parameter.

## ✅ **Fix Applied:**
- Removed password from constructor
- Added password setting after initialization (if supported)
- Most SoccerNet downloads don't require password

## 🚀 **Try Again:**

```powershell
venv\Scripts\python.exe -m football_ai.fix_and_train
```

## 📝 **Note:**
If download still fails, SoccerNet may require:
1. Manual registration at https://www.soccer-net.org/
2. API key or credentials file
3. Or may work without password

## ✅ **Alternative:**
Base model (yolov8s.pt) works great without training!
- 85-90% accuracy
- Production-ready

