# 🔧 Fix PowerShell & Start Training

## ⚠️ **Problems Found:**

1. **PowerShell Execution Policy** - Scripts are disabled
2. **Batch File Path** - Need `.\` prefix in PowerShell

---

## ✅ **Solution 1: Use Batch File (CMD)**

**Open CMD (not PowerShell):**

1. Press `Win + R`
2. Type: `cmd`
3. Navigate:
   ```cmd
   cd C:\Users\troll\CascadeProjects\football-analytics-app
   ```
4. Run:
   ```cmd
   start-training-properly.bat
   ```

---

## ✅ **Solution 2: Fix PowerShell Execution Policy**

**Run PowerShell as Administrator:**

1. Right-click PowerShell → "Run as Administrator"
2. Run:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```
3. Type `Y` to confirm
4. Then run:
   ```powershell
   .\start-training.ps1
   ```

---

## ✅ **Solution 3: Direct Python (Easiest)**

**Run directly without activation:**

```powershell
.\venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000
```

**Or in CMD:**
```cmd
venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000
```

---

## ✅ **Solution 4: Use Batch File in PowerShell**

**With `.\` prefix:**
```powershell
.\start-training-properly.bat
```

---

## 🎯 **Recommended: Solution 3 (Direct Python)**

**Copy-paste this in PowerShell:**

```powershell
cd C:\Users\troll\CascadeProjects\football-analytics-app
.\venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000
```

**Or in CMD:**

```cmd
cd C:\Users\troll\CascadeProjects\football-analytics-app
venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000
```

---

## ✅ **Verify It's Running:**

After starting, check:

1. **Task Manager:**
   - Look for `python.exe`
   - Should show CPU usage

2. **Output:**
   - Should see: "Downloading SoccerNet Videos..."
   - Or: "Processing SoccerNet to YOLOv8 Format..."

3. **Directories:**
   ```powershell
   dir datasets\football_yolo
   dir football_models\football_soccernet
   ```

---

## 📝 **Quick Start (Copy-Paste):**

**PowerShell:**
```powershell
cd C:\Users\troll\CascadeProjects\football-analytics-app
.\venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000
```

**CMD:**
```cmd
cd C:\Users\troll\CascadeProjects\football-analytics-app
venv\Scripts\python.exe -m football_ai.prepare_soccernet_training --all --max-games 10 --frames-per-game 1000
```

---

**Choose one solution and run it!** 🚀

