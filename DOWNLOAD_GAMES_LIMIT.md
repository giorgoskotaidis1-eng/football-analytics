# 🎯 Download Games Limit - Updated

## ✅ **Default: 50 Games**

Το script **τώρα κατεβάζει μόνο 50 games** από default (αρκετά για training).

### **Μέγεθος με 50 games:**
- **Videos**: 50 × 2 = 100 videos
- **Size**: ~100 × 400 MB = **~40 GB** (αντί για 320 GB)
- **Download time** (50 Mbps): **~2-3 ώρες** ⭐

---

## 🚀 **Usage**

### **Default (50 games):**
```bash
python ai_pipeline/vision/download_soccernet.py
```

### **Custom limit:**
```bash
# Κατέβασε 20 games
python ai_pipeline/vision/download_soccernet.py --max-games 20

# Κατέβασε 100 games
python ai_pipeline/vision/download_soccernet.py --max-games 100
```

### **Download όλα (350-400 games):**
```bash
python ai_pipeline/vision/download_soccernet.py --all
```

---

## 📊 **Recommended Limits**

| Games | Size | Time (50 Mbps) | Use Case |
|-------|------|----------------|----------|
| **20** | ~16 GB | ~1 ώρα | Quick test |
| **50** | ~40 GB | ~2-3 ώρες | **Recommended** ⭐ |
| **100** | ~80 GB | ~4-6 ώρες | Better accuracy |
| **200** | ~160 GB | ~8-12 ώρες | High accuracy |
| **All** | ~320 GB | ~15-20 ώρες | Maximum accuracy |

---

## ✅ **Why 50 Games?**

- **Αρκετά για training**: 50 games = ~500K-1M images
- **Καλή accuracy**: 70-85% mAP50 (με 10 epochs)
- **Εύκολο download**: 2-3 ώρες αντί για 15-20
- **Μικρότερο disk space**: 40 GB αντί για 320 GB

---

## 💡 **Tips**

1. **Start with 50**: Κατέβασε 50, δοκίμασε training, αν χρειάζεσαι περισσότερα, κατέβασε άλλα 50
2. **Smart Skip**: Αν έχεις ήδη 30 games, θα κατεβάσει μόνο 20 ακόμα
3. **Resume**: Μπορείς να σταματήσεις και να συνεχίσεις

---

## 🎯 **Bottom Line**

**Default: 50 games** = **~40 GB** = **~2-3 ώρες download** ✅

Αν χρειάζεσαι περισσότερα, απλά τρέξε:
```bash
python ai_pipeline/vision/download_soccernet.py --max-games 100
```

