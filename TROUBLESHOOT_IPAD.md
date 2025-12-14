# 🔧 Troubleshooting iPad Connection

## ✅ Checklist - Τι να ελέγξεις:

### 1. Ο server τρέχει;
- Βεβαιώσου ότι βλέπεις: `- Local: http://localhost:3000`
- Αν δεν τρέχει, τρέξε: `npm run dev`

### 2. Το IP address είναι σωστό;
- **ΧΡΕΙΑΖΕΣΑΙ LOCAL IP** (192.168.x.x ή 10.x.x.x)
- **ΟΧΙ** το public IP (46.177.220.30)
- Τρέξε: `FIND_LOCAL_IP.bat` για να βρεις το σωστό IP

### 3. Το iPad είναι στο ίδιο WiFi;
- Το iPad **ΠΡΕΠΕΙ** να είναι στο **ίδιο WiFi** με τον υπολογιστή
- Αν είναι σε διαφορετικό WiFi, **ΔΕΝ** θα δουλέψει

### 4. Firewall block;
1. Windows Security → Firewall & network protection
2. Allow an app through firewall
3. Βρες "Node.js" και βεβαιώσου ότι είναι checked για "Private" networks

### 5. Δοκίμασε από browser στον υπολογιστή;
- Στο browser του υπολογιστή, πήγαινε: `http://[LOCAL_IP]:3000`
- Αν δεν ανοίγει ούτε εκεί, το πρόβλημα είναι στο server

### 6. Port 3000 είναι ανοιχτό;
- Μπορεί κάποιο άλλο app να χρησιμοποιεί το port 3000
- Δοκίμασε να αλλάξεις port: `npm run dev -- -p 3001`

---

## 🎯 Step-by-Step Test:

1. **Βρες το LOCAL IP:**
   ```
   Τρέξε: FIND_LOCAL_IP.bat
   Θα δεις: 192.168.1.xxx (ή 10.x.x.x)
   ```

2. **Τρέξε τον server:**
   ```
   npm run dev
   ```

3. **Δοκίμασε στον υπολογιστή:**
   ```
   Browser: http://192.168.1.xxx:3000
   (αντικατέστησε xxx με το IP σου)
   ```

4. **Αν δουλεύει στον υπολογιστή, δοκίμασε στο iPad:**
   ```
   Safari: http://192.168.1.xxx:3000
   ```

---

## ⚠️ Common Mistakes:

❌ **Λάθος:** `http://46.177.220.30:3000` (public IP)
✅ **Σωστό:** `http://192.168.1.100:3000` (local IP)

❌ **Λάθος:** `http://localhost:3000` (στο iPad)
✅ **Σωστό:** `http://192.168.1.100:3000` (με το IP)

❌ **Λάθος:** iPad σε διαφορετικό WiFi
✅ **Σωστό:** iPad στο ίδιο WiFi

---

## 🔥 Quick Fix - Firewall:

Αν το firewall block:
1. Windows Security → Firewall
2. Advanced settings
3. Inbound Rules → New Rule
4. Port → TCP → 3000
5. Allow connection
6. Apply to all profiles

---

## 💡 Alternative: Use ngrok (if nothing works)

Αν τίποτα δεν δουλεύει, μπορείς να χρησιμοποιήσεις ngrok:
1. Download ngrok
2. `ngrok http 3000`
3. Θα σου δώσει ένα public URL
4. Χρησιμοποίησε αυτό το URL στο iPad


