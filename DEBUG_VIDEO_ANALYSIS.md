# 🔍 Debug Video Analysis - Troubleshooting Guide

## Πρόβλημα: Δεν βγάζει στατιστικά

### Βήμα 1: Έλεγξε Console Logs

Άνοιξε το terminal όπου τρέχει το Next.js server και δες τα logs:

```bash
# Look for these messages:
[video-analyze] Starting AI analysis for video: ...
[ai/analyze-video] Running: python ...
[FootballAI] Loaded YOLOv8s model...
[FootballAI] Video: ...x..., ... FPS, ... frames
[FootballAI] Progress: ...%
[FootballAI] Detected ... events
[video-analyze] Analysis response received, status: ...
[video-analyze] Converted to ... MatchEvents
[video-analyze] Successfully saved ... events to database
```

### Βήμα 2: Έλεγξε Python Script

```bash
# Test αν το Python script λειτουργεί:
cd C:\Users\troll\CascadeProjects\football-analytics-app
venv\Scripts\python.exe football_ai\analysis.py test_video.mp4
```

### Βήμα 3: Έλεγξε Video File

- ✅ Video format: MP4, AVI, MOV, MKV
- ✅ Video size: < 10GB
- ✅ Video quality: HD (720p+) recommended
- ✅ Video shows full pitch view

### Βήμα 4: Common Issues

#### Issue 1: "Python process exited with code 1"
**Solution**: 
- Έλεγξε αν το Python venv είναι activated
- Έλεγξε αν το ultralytics είναι installed: `venv\Scripts\pip.exe list | findstr ultralytics`

#### Issue 2: "No events detected"
**Possible causes**:
- Video quality too low
- Video doesn't show clear football action
- AI model needs better training
- Video is too short

**Solution**:
- Try with better quality video
- Try with longer video (at least 1-2 minutes)
- Check if video shows players and ball clearly

#### Issue 3: "Failed to parse Python output"
**Solution**:
- Check Python script output format
- Check if script returns valid JSON

### Βήμα 5: Manual Test

```bash
# Test Python script directly:
venv\Scripts\python.exe -c "from football_ai.analysis import FootballVideoAnalyzer; analyzer = FootballVideoAnalyzer(); result = analyzer.analyze_video('path/to/video.mp4'); print(result)"
```

### Βήμα 6: Check Database

```sql
-- Check if events were saved:
SELECT * FROM MatchEvent WHERE matchId = ? ORDER BY createdAt DESC LIMIT 10;
```

### Βήμα 7: Check API Response

Open browser DevTools → Network tab → Find `/api/matches/[id]/video/analyze` request → Check response

Expected response:
```json
{
  "ok": true,
  "analysis": {
    "eventsDetected": 10,
    "shots": { "home": 5, "away": 3 },
    "xg": { "home": 1.2, "away": 0.8 }
  }
}
```

## Quick Fixes

### Fix 1: Reinstall Python Dependencies
```bash
venv\Scripts\pip.exe install --upgrade ultralytics opencv-python
```

### Fix 2: Check Video Path
Make sure video file exists and path is correct:
```bash
dir uploads\videos\match-*\*.mp4
```

### Fix 3: Test with Small Video
Try with a small test video (10-30 seconds) first to see if it works.

## Next Steps

1. Check console logs for errors
2. Test Python script directly
3. Try with different video
4. Check database for saved events
5. Report specific error messages





