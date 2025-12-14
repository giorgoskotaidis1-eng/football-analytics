# ⚽ Ball Detection - Complete Guide

## 🎯 **What You Need:**

### **1. Model Options:**

#### **Option A: Add Ball Class to Current Training (Recommended)** ⭐
- **Same YOLOv8 model** (που train για players)
- **Add ball as class 1** (players = class 0, ball = class 1)
- **Single model** για players + ball
- **Best performance** - One model, faster inference

#### **Option B: Separate Ball Detection Model**
- **Separate YOLOv8 model** μόνο για ball
- **Two models** (players + ball)
- **More flexible** - Can use pre-trained ball model
- **Slower** - Two model runs per frame

---

## 🚀 **Option A: Add Ball to Current Training (Best)**

### **What You Need:**

1. **Ball Annotations:**
   - Bounding boxes για ball σε frames
   - Format: YOLO format (class 1, x_center, y_center, width, height)
   - Sources:
     - SoccerNet (αν έχει ball annotations)
     - Custom annotation (αν έχεις videos)
     - Public datasets (Roboflow, Kaggle)

2. **Update Dataset:**
   - Add ball images + labels στο `datasets/soccernet_yolo/`
   - Update `data.yaml` για 2 classes

3. **Retrain Model:**
   - Train με players + ball classes
   - Same YOLOv8 architecture

---

## 📊 **Implementation Steps:**

### **Step 1: Update data.yaml**

```yaml
path: datasets/soccernet_yolo
train: images/train
val: images/train
nc: 2  # 2 classes: player + ball
names: ["player", "ball"]  # class 0 = player, class 1 = ball
```

### **Step 2: Add Ball Annotations**

**If you have SoccerNet ball data:**
- SoccerNet μπορεί να έχει ball annotations
- Convert to YOLO format (όπως έκανες για players)

**If you need to annotate:**
- Use tools: LabelImg, CVAT, Roboflow
- Annotate ball σε frames από videos
- Export as YOLO format

### **Step 3: Retrain Model**

```bash
python ai_pipeline/vision/train_yolo_soccernet.py --epochs 50
```

**Result:**
- Model detect **both** players + ball
- Single model, faster inference
- Better coordination between players & ball

---

## 🎯 **Option B: Separate Ball Model**

### **Use Pre-trained Ball Detection:**

**Option 1: Use Existing Ball Model**
- Download pre-trained ball detection model
- Run separately from player model
- Combine results

**Option 2: Train Separate Ball Model**
- Train YOLOv8 μόνο για ball
- Use ball-specific dataset
- Run in parallel με player model

---

## 📊 **Comparison:**

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **Option A: Combined** | ✅ Single model<br>✅ Faster<br>✅ Better coordination | ⚠️ Needs ball annotations<br>⚠️ Retrain required | ⭐ **Best** |
| **Option B: Separate** | ✅ Can use pre-trained<br>✅ More flexible | ❌ Two models<br>❌ Slower<br>❌ Coordination harder | Alternative |

---

## 🔍 **Where to Get Ball Annotations:**

### **1. SoccerNet:**
- Check if SoccerNet έχει ball bounding boxes
- Look for `*_ball_boundingbox*.json` files
- Convert to YOLO format

### **2. Public Datasets:**
- **Roboflow**: Football ball detection datasets
- **Kaggle**: Football datasets with ball annotations
- **Open Images**: May have ball annotations

### **3. Custom Annotation:**
- Use **LabelImg** (free, easy)
- Use **CVAT** (professional)
- Use **Roboflow** (cloud-based)
- Annotate ball σε frames από videos

---

## 💡 **Recommended Approach:**

### **Phase 1: Complete Player Training (Now)**
```bash
python ai_pipeline/vision/train_yolo_soccernet.py --epochs 50
```
**Result**: Players detection ✅

### **Phase 2: Add Ball Detection (Later)**

**If you have ball annotations:**
1. Add ball labels στο dataset
2. Update `data.yaml` για 2 classes
3. Retrain model

**If you don't have ball annotations:**
1. Use pre-trained ball model (separate)
2. Or annotate ball σε frames
3. Then train combined model

---

## 🎯 **Quick Start (If You Have Ball Data):**

### **1. Check SoccerNet for Ball Annotations:**
```bash
# Look for ball annotation files
find datasets/soccernet_data -name "*ball*.json"
```

### **2. If Found, Convert to YOLO:**
- Similar to `soccernet_to_yolo_all.py`
- Add ball class (class 1)
- Combine με player labels

### **3. Update data.yaml:**
```yaml
nc: 2
names: ["player", "ball"]
```

### **4. Retrain:**
```bash
python ai_pipeline/vision/train_yolo_soccernet.py --epochs 50
```

---

## ✅ **Bottom Line:**

**For Ball Detection, you need:**

1. **Model**: Same YOLOv8 (add ball class) ⭐ **OR** Separate ball model
2. **Data**: Ball annotations (YOLO format)
3. **Training**: Retrain με players + ball **OR** Train separate ball model

**Best approach**: Add ball class στο current training (Option A) ⭐

**First**: Complete player training, then add ball detection! 🚀

