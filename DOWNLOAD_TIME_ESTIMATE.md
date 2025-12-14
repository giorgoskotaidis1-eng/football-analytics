# ⏱️ Download Time Estimate - SoccerNet Dataset

## 📊 **Dataset Size Calculation**

### **What We're Downloading:**
- **Games**: ~350-400 games (SoccerNet train split)
- **Per game**: 2 halves (1_224p.mkv + 2_224p.mkv)
- **Total videos**: ~700-800 video files
- **JSON files**: ~800 files (bounding boxes)

### **File Sizes:**
- **224p video** (per half, ~90 minutes): **200-500 MB** (average ~400 MB)
- **JSON file** (bounding boxes): **1-5 MB** (average ~2 MB)

### **Total Size:**
- **Videos**: 800 × 400 MB = **~320 GB**
- **JSON files**: 800 × 2 MB = **~1.6 GB**
- **TOTAL**: **~320-350 GB**

---

## ⏱️ **Download Time Estimates**

### **By Internet Speed:**

| Speed | Download Time | Notes |
|-------|--------------|-------|
| **10 Mbps** | **~78-85 ώρες** | 3-4 μέρες (αργό) |
| **25 Mbps** | **~30-35 ώρες** | 1.5 μέρες |
| **50 Mbps** | **~15-17 ώρες** | 1 μέρα |
| **100 Mbps** | **~7-9 ώρες** | Μισή μέρα |
| **200 Mbps** | **~4-5 ώρες** | Γρήγορο |
| **500 Mbps** | **~1.5-2 ώρες** | Πολύ γρήγορο |
| **1 Gbps** | **~45-60 λεπτά** | Πολύ γρήγορο |

---

## ⚡ **Factors That Affect Speed:**

### **1. SoccerNet Server Speed:**
- Το SoccerNetDownloader μπορεί να έχει rate limiting
- Μπορεί να υπάρχουν bottlenecks στον server
- **Realistic speed**: 50-100 Mbps (ανάλογα με το server)

### **2. Network Stability:**
- Αν διακοπεί η σύνδεση, το script **resume** (smart skip)
- Όσα έχουν κατεβεί, **δεν ξανακατεβάζονται**

### **3. Smart Skip Feature:**
- Αν έχεις ήδη κατεβάσει κάποια games, **skip** αυτόματα
- **Δεν χάνεις χρόνο** σε existing files

---

## 🎯 **Realistic Estimate:**

### **First Time Download:**
- **Slow connection (10-25 Mbps)**: **2-4 μέρες**
- **Medium connection (50-100 Mbps)**: **8-20 ώρες**
- **Fast connection (200+ Mbps)**: **4-8 ώρες**

### **Resume/Partial Download:**
- Αν έχεις ήδη κατεβάσει 50%: **Μισός χρόνος**
- Αν έχεις κατεβάσει 90%: **1-2 ώρες** (μόνο τα missing)

---

## 💡 **Tips to Speed Up:**

1. **Run Overnight**: Αφήσε το να τρέχει τη νύχτα
2. **Use Fast Connection**: Αν έχεις πρόσβαση σε γρήγορο internet
3. **Check Progress**: Το script δείχνει progress
4. **Resume Safe**: Μπορείς να το σταματήσεις και να συνεχίσεις αργότερα

---

## 📊 **Progress Tracking:**

Το script δείχνει:
- Complete games (already downloaded)
- Incomplete games (need download)
- Sample of missing files

Μπορείς να δεις το progress σε real-time.

---

## ⚠️ **Important Notes:**

1. **Disk Space**: Χρειάζεσαι **~350 GB** ελεύθερο χώρο
2. **Resume**: Μπορείς να σταματήσεις και να συνεχίσεις
3. **Skip Existing**: Δεν ξανακατεβάζει existing files
4. **Password**: `s0cc3rn3t` (already set in script)

---

## ✅ **Bottom Line:**

**Realistic estimate για πρώτο download:**
- **Slow (10-25 Mbps)**: 2-4 μέρες
- **Medium (50-100 Mbps)**: 8-20 ώρες ⭐ **Most common**
- **Fast (200+ Mbps)**: 4-8 ώρες

**Συμβουλή**: Αφήσε το να τρέχει **overnight** ή όταν δεν χρησιμοποιείς το internet!

