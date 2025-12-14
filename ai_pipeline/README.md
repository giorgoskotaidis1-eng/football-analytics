# 🤖 AI Pipeline for Football Analytics

Unified AI training and inference pipeline for football video analysis, event detection, and analytics models.

## 📁 Structure

```
ai_pipeline/
├── vision/          # YOLO training for player detection
├── events/          # Event dataset preparation from CSVs
├── models/          # Analytics models (xG, pass value)
├── runtime/         # Inference functions for backend
└── README.md        # This file
```

## 🎯 Pipeline Overview

```
VIDEO → (vision/ train & inference) → detections+tracks+pitch coords
detections+tracks+video_time → (events/ scripts) → structured events CSV
events CSV → (models/ train scripts) → xG/xA/pass models
runtime/ → functions for backend inference
```

---

## 1️⃣ Vision Pipeline (Player Detection)

### Setup

1. **Download SoccerNet data:**
   ```bash
   python ai_pipeline/vision/download_soccernet.py
   ```
   - Downloads videos and bounding boxes
   - Skips already downloaded files
   - Password: `s0cc3rn3t`

2. **Convert to YOLOv8 format:**
   ```bash
   python ai_pipeline/vision/soccernet_to_yolo_all.py
   ```
   - Converts SoccerNet videos → YOLO images + labels
   - Output: `datasets/soccernet_yolo/`

3. **Train YOLOv8 model:**
   ```bash
   python ai_pipeline/vision/train_yolo_soccernet.py
   ```
   - Trains player detection model
   - Output: `runs/detect/soccernet_players_all/weights/best.pt`

### Expected Results

- **Dataset**: 500,000 - 1,500,000 images
- **Accuracy**: 70-85% mAP50 (with 10 epochs), 85-92% (with 50-100 epochs)
- **Model**: `best.pt` for player detection

---

## 2️⃣ Events Dataset Pipeline

### Prerequisites

Export event CSVs from your application to `data/events/` with columns:

**Required:**
- `match_id` (string)
- `team` (string: "home" or "away")
- `player_id` (string, optional)
- `event_type` (string: "shot", "pass", "touch", etc.)
- `timestamp` (float, seconds)
- `x` (float, 0-100, horizontal position)
- `y` (float, 0-100, vertical position)

**For shots:**
- `metadata` (JSON string) with: `{"is_goal": 0/1, "body_part": "foot", "shot_type": "open_play", ...}`
- `minute` (int, optional)

**For passes:**
- `x_end` (float, 0-100, end x coordinate)
- `y_end` (float, 0-100, end y coordinate)
- `metadata` (JSON string) with: `{"leading_to_shot": 0/1, "leading_to_goal": 0/1, ...}`

### Prepare Datasets

1. **Shot dataset:**
   ```bash
   python ai_pipeline/events/prepare_shot_dataset.py
   ```
   - Output: `data/processed/shots_train.parquet`, `shots_valid.parquet`

2. **Pass dataset:**
   ```bash
   python ai_pipeline/events/prepare_pass_dataset.py
   ```
   - Output: `data/processed/passes_train.parquet`, `passes_valid.parquet`

---

## 3️⃣ Analytics Models Training

### Train xG Model

```bash
python ai_pipeline/models/train_xg_shots.py
```

**Requirements:**
- `data/processed/shots_train.parquet` and `shots_valid.parquet`
- LightGBM (preferred), XGBoost, or sklearn

**Output:**
- Model: `ai_pipeline/models/xg_shots_model.pkl`
- Metrics: AUC, Log Loss, Brier Score

### Train Pass Value Model

```bash
python ai_pipeline/models/train_pass_value.py
```

**Requirements:**
- `data/processed/passes_train.parquet` and `passes_valid.parquet`
- LightGBM (preferred), XGBoost, or sklearn

**Output:**
- Model: `ai_pipeline/models/pass_value_model.pkl`
- Metrics: RMSE, MAE, R²

---

## 4️⃣ Runtime Inference

### Usage in Backend

```python
from ai_pipeline.runtime.xg_runtime import predict_shot_xg, predict_pass_value, get_zone

# Predict xG for a shot
shot_features = {
    'x_shot': 0.85,  # normalized 0-1
    'y_shot': 0.5,
    'body_part': 'foot',
    'shot_type': 'open_play',
    'under_pressure': 0,
    'num_defenders': 1
}
xg = predict_shot_xg(shot_features)
print(f"xG: {xg:.3f}")

# Predict pass value
pass_features = {
    'x_start': 0.5,
    'y_start': 0.5,
    'x_end': 0.7,
    'y_end': 0.5,
    'pass_type': 'normal'
}
value = predict_pass_value(pass_features)
print(f"Pass value: {value:.3f}")

# Get zone from coordinates
zone = get_zone(0.7, 0.5)
print(f"Zone: {zone}")  # "Att third"
```

---

## 🚀 Complete Pipeline Execution

### Step-by-Step

```bash
# 1. Vision training
python ai_pipeline/vision/download_soccernet.py
python ai_pipeline/vision/soccernet_to_yolo_all.py
python ai_pipeline/vision/train_yolo_soccernet.py

# 2. Export events from your app to data/events/*.csv

# 3. Prepare event datasets
python ai_pipeline/events/prepare_shot_dataset.py
python ai_pipeline/events/prepare_pass_dataset.py

# 4. Train analytics models
python ai_pipeline/models/train_xg_shots.py
python ai_pipeline/models/train_pass_value.py

# 5. Use runtime functions in your backend
```

---

## 📊 Expected Performance

### Vision (Player Detection)
- **10 epochs**: 70-85% mAP50
- **50-100 epochs**: 85-92% mAP50
- **With yolov8s**: +5-10% accuracy boost

### Analytics Models
- **xG Model**: AUC > 0.75 (good), > 0.85 (excellent)
- **Pass Value Model**: R² > 0.3 (good), > 0.5 (excellent)

---

## 🔧 Dependencies

### Required
- Python 3.8+
- `ultralytics` (YOLOv8)
- `pandas`, `numpy`
- `scikit-learn`
- `opencv-python`
- `SoccerNet`

### Optional (for better performance)
- `lightgbm` (preferred for gradient boosting)
- `xgboost` (alternative)
- `pyarrow` (for parquet files)

### Install
```bash
pip install ultralytics pandas numpy scikit-learn opencv-python SoccerNet pyarrow
pip install lightgbm  # or xgboost
```

---

## 📝 Notes

1. **Coordinate System:**
   - Application uses 0-100 coordinates
   - Models use 0-1 normalized coordinates
   - Conversion handled automatically

2. **Metadata Format:**
   - Events should have `metadata` as JSON string
   - Example: `{"is_goal": 1, "body_part": "foot", "shot_type": "open_play"}`

3. **Model Updates:**
   - Retrain models when you have more data
   - Models are saved as `.pkl` files (joblib format)

4. **Integration:**
   - Runtime functions can be called from TypeScript/Node.js backend
   - Use Python subprocess or API wrapper if needed

---

## 🐛 Troubleshooting

### "Model not found" errors
- Run training scripts first
- Check model paths in `ai_pipeline/models/`

### "No CSV files found"
- Export events from your app to `data/events/`
- Ensure CSV format matches expected columns

### "Feature mismatch" errors
- Ensure CSV exports match expected format
- Check metadata JSON structure

---

## ✅ Status

- ✅ Vision pipeline (YOLO training)
- ✅ Events dataset preparation
- ✅ Analytics models (xG, pass value)
- ✅ Runtime inference functions
- ✅ Documentation

**Ready for production use!** 🎉

