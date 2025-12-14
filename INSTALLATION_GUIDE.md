# 📦 Installation Guide - Step by Step

## 🎯 Overview

Αυτός ο οδηγός σου λέει τι να εγκαταστήσεις στο CMD για να προσθέσεις features σιγά σιγά.

---

## ✅ Βήμα 1: Basic Setup (Ήδη Έτοιμο)

Τα βασικά είναι ήδη εγκατεστημένα:
- ✅ Node.js & npm
- ✅ Next.js
- ✅ Prisma
- ✅ Database (SQLite)

---

## 🚀 Βήμα 2: Validation & Error Handling

### Εγκατάσταση:
```cmd
npm install zod
```

**Τι κάνει**: Ελέγχει τα δεδομένα που μπαίνουν (validation)
**Πότε**: Όταν θέλεις να ελέγχεις ότι τα forms είναι σωστά

---

## 🎨 Βήμα 3: Toast Notifications

### Εγκατάσταση:
```cmd
npm install react-hot-toast
```

**Τι κάνει**: Εμφανίζει μηνύματα success/error (π.χ. "Match created successfully!")
**Πότε**: Για καλύτερο UX feedback

---

## 📊 Βήμα 4: Charts & Visualizations

### Εγκατάσταση:
```cmd
npm install recharts
```

**Τι κάνει**: Γραφήματα και charts (xG timeline, shot maps, etc.)
**Πότε**: Όταν θέλεις να προσθέσεις γραφήματα

---

## 🖼️ Βήμα 5: Image Upload

### Εγκατάσταση:
```cmd
npm install multer
npm install @types/multer
```

**Τι κάνει**: Upload φωτογραφιών (player photos, team logos)
**Πότε**: Όταν θέλεις να ανεβάζεις εικόνες

---

## 🎥 Βήμα 6: Video Analysis (Advanced)

### Εγκατάσταση:
```cmd
npm install opencv4nodejs
npm install @tensorflow/tfjs-node
```

**Τι κάνει**: AI video analysis (ανίχνευση events από βίντεο)
**Πότε**: Όταν θέλεις να αναλύεις βίντεο με AI
**Σημείωση**: Χρειάζεται OpenCV installed στον υπολογιστή

---

## 💳 Βήμα 7: Payment Integration (Stripe)

### Εγκατάσταση:
```cmd
npm install stripe
npm install @stripe/stripe-js
```

**Τι κάνει**: Πληρωμές και subscriptions
**Πότε**: Όταν θέλεις να προσθέσεις billing

---

## 🔍 Βήμα 8: Advanced Search

### Εγκατάσταση:
```cmd
npm install fuse.js
```

**Τι κάνει**: Fuzzy search (εύρεση players/teams/matches)
**Πότε**: Όταν θέλεις καλύτερο search

---

## 📄 Βήμα 9: PDF Export

### Εγκατάσταση:
```cmd
npm install jspdf
npm install jspdf-autotable
```

**Τι κάνει**: Export match reports σε PDF
**Πότε**: Όταν θέλεις να κατεβάζεις reports

---

## 🔄 Βήμα 10: Data Fetching (React Query)

### Εγκατάσταση:
```cmd
npm install @tanstack/react-query
```

**Τι κάνει**: Καλύτερο data fetching με caching
**Πότε**: Όταν θέλεις καλύτερη performance

---

## 📝 Προτεραιότητα Εγκατάστασης

### 🔴 High Priority (Κάνε τώρα):
1. **zod** - Validation (προστασία από λάθος data)
2. **react-hot-toast** - Toast notifications (UX)

### 🟡 Medium Priority (Σύντομα):
3. **recharts** - Charts & visualizations
4. **multer** - Image uploads

### 🟢 Low Priority (Αργότερα):
5. **stripe** - Payments
6. **opencv4nodejs** - Video analysis
7. **jspdf** - PDF exports

---

## 💡 Πώς να Εγκαταστήσεις

1. **Άνοιξε Command Prompt** (CMD)
2. **Πήγαινε στο project folder**:
   ```cmd
   cd C:\Users\troll\CascadeProjects\football-analytics-app
   ```
3. **Εγκατάστησε το package**:
   ```cmd
   npm install zod
   ```
4. **Περίμενε** να τελειώσει
5. **Έτοιμο!** ✅

---

## ⚠️ Προσοχή

- **Μην εγκαταστήσεις όλα μαζί** - Κάνε ένα-ένα
- **Μετά από κάθε εγκατάσταση**, τρέξε `npm run dev` για να δεις αν δουλεύει
- **Αν έχεις error**, πες μου και το διορθώνουμε

---

## 🎯 Τι να Κάνεις Τώρα

**Συνιστώ να ξεκινήσεις με:**
```cmd
npm install zod react-hot-toast
```

Αυτά είναι τα πιο σημαντικά και θα βελτιώσουν αμέσως την εφαρμογή!

---

**Έτοιμο!** 🚀

