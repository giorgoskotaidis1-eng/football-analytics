# 🚀 Training Command - Next Step

## ✅ **After Conversion is Done:**

Μόλις τελειώσει το `soccernet_to_yolo_all.py`, τρέξε:

```bash
python ai_pipeline/vision/train_yolo_soccernet.py
```

---

## 📋 **Complete Pipeline:**

```bash
# 1. Download (ήδη έγινε)
python ai_pipeline/vision/download_soccernet.py

# 2. Convert (τρέχει τώρα)
python ai_pipeline/vision/soccernet_to_yolo_all.py

# 3. Train (επόμενο βήμα) ⬅️ ΑΥΤΟ!
python ai_pipeline/vision/train_yolo_soccernet.py
```

---

## 🎯 **What the Training Script Does:**

1. **Loads YOLOv8** (yolov8s.pt με GPU, yolov8n.pt με CPU)
2. **Trains for 10 epochs**
3. **Saves model** στο `runs/detect/soccernet_players_all/weights/best.pt`

---

## ⏱️ **Time:**

- **GPU**: 2-4 ώρες
- **CPU**: 6-12 ώρες

---

## ✅ **Ready to Train!**

Μόλις τελειώσει το conversion, τρέξε:

```bash
python ai_pipeline/vision/train_yolo_soccernet.py
```

🎯

