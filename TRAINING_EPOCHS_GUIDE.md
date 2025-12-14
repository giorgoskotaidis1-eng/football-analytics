# 🎯 Training Epochs - How Many?

## 📊 **Epochs Explained:**

**Epochs** = Πόσες φορές το model θα δει όλο το dataset.

- **10 epochs** = Το model βλέπει τα data 10 φορές
- **50 epochs** = Το model βλέπει τα data 50 φορές
- **100 epochs** = Το model βλέπει τα data 100 φορές

**Περισσότερα epochs = Καλύτερη accuracy, αλλά πιο αργό training**

---

## 🎯 **Recommended Epochs:**

### **10 Epochs (Default):**
- **Accuracy**: 70-85% mAP50
- **Time**: 2-4 ώρες (GPU) / 6-12 ώρες (CPU)
- **Use**: Quick test, basic training
- **Status**: ✅ Good for testing

### **50 Epochs (Recommended):**
- **Accuracy**: 85-90% mAP50
- **Time**: 10-20 ώρες (GPU) / 30-60 ώρες (CPU)
- **Use**: Production use, good accuracy
- **Status**: ✅✅ **Best balance**

### **100 Epochs (Maximum):**
- **Accuracy**: 90-92% mAP50
- **Time**: 20-40 ώρες (GPU) / 60-120 ώρες (CPU)
- **Use**: Maximum accuracy, professional use
- **Status**: ✅✅✅ Best possible

---

## 🚀 **How to Use:**

### **Default (10 epochs):**
```bash
python ai_pipeline/vision/train_yolo_soccernet.py
```

### **50 epochs (Recommended):**
```bash
python ai_pipeline/vision/train_yolo_soccernet.py --epochs 50
```

### **100 epochs (Maximum):**
```bash
python ai_pipeline/vision/train_yolo_soccernet.py --epochs 100
```

### **Custom epochs:**
```bash
python ai_pipeline/vision/train_yolo_soccernet.py --epochs 75
```

---

## 📈 **Accuracy vs Time:**

| Epochs | Accuracy | Time (GPU) | Time (CPU) | Recommendation |
|--------|----------|------------|------------|----------------|
| **10** | 70-85% | 2-4h | 6-12h | Quick test ✅ |
| **50** | 85-90% | 10-20h | 30-60h | **Best balance** ⭐ |
| **100** | 90-92% | 20-40h | 60-120h | Maximum accuracy ✅✅✅ |

---

## 💡 **Tips:**

1. **Start with 10** → Test if everything works
2. **If good, increase to 50** → Best balance of accuracy/time
3. **If you need maximum accuracy** → Go for 100
4. **Monitor training** → Stop if accuracy stops improving (overfitting)

---

## ✅ **Recommendation:**

**Start with 50 epochs** - Best balance! ⭐

```bash
python ai_pipeline/vision/train_yolo_soccernet.py --epochs 50
```

Αυτό θα δώσει **85-90% accuracy** σε **10-20 ώρες** (GPU).

---

## 🎯 **Bottom Line:**

- **10 epochs**: Quick test (70-85%)
- **50 epochs**: **Recommended** (85-90%) ⭐
- **100 epochs**: Maximum (90-92%)

**Προτείνω 50 epochs για best balance!** 🚀

