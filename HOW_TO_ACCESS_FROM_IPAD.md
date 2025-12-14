# 📱 Πώς να δεις την εφαρμογή στο iPad

## Βήμα 1: Βρες το IP Address του υπολογιστή σου

### Μέθοδος 1: Με Command Prompt
1. Άνοιξε **Command Prompt** (cmd)
2. Γράψε: `ipconfig`
3. Βρες το **IPv4 Address** που είναι κάτι σαν `192.168.1.xxx` ή `10.0.0.xxx`

### Μέθοδος 2: Με το batch file
1. Κάνε double-click στο `FIND_IP.bat`
2. Θα δεις το IP address σου

### Μέθοδος 3: Μετά από Settings
1. Windows Settings → Network & Internet → Wi-Fi
2. Κάνε click στο WiFi network σου
3. Κάτω θα δεις "IPv4 address"

---

## Βήμα 2: Βεβαιώσου ότι ο server τρέχει

1. Άνοιξε terminal στο project folder
2. Τρέξε: `npm run dev`
3. Βεβαιώσου ότι βλέπεις: `- Local: http://localhost:3000`

---

## Βήμα 3: Βεβαιώσου ότι το iPad είναι στο ίδιο WiFi

- Το iPad **ΠΡΕΠΕΙ** να είναι στο **ίδιο WiFi network** με τον υπολογιστή σου
- Αν είναι σε διαφορετικό WiFi, δεν θα δουλέψει

---

## Βήμα 4: Άνοιξε την εφαρμογή στο iPad

1. Άνοιξε **Safari** στο iPad
2. Στο address bar γράψε: `http://[IP_ADDRESS]:3000`
   - Για παράδειγμα: `http://192.168.1.100:3000`
   - **ΧΡΗΣΙΜΟΠΟΙΗΣΕ το IP που βρήκες στο Βήμα 1**

---

## Βήμα 5: Αν δεν ανοίγει

### Firewall Issues
1. Windows Security → Firewall & network protection
2. Allow an app through firewall
3. Βεβαιώσου ότι το Node.js είναι allowed

### Next.js Configuration
Αν δεν δουλεύει, μπορεί να χρειάζεται να αλλάξουμε το Next.js config για να accept connections από το network.

---

## ⚠️ Σημαντικό

- Ο server **ΠΡΕΠΕΙ** να τρέχει στον υπολογιστή
- Το iPad **ΠΡΕΠΕΙ** να είναι στο ίδιο WiFi
- Χρησιμοποίησε το **IP address**, όχι `localhost`

---

## 🎯 Quick Test

1. Βρες το IP (π.χ. `192.168.1.100`)
2. Τρέξε `npm run dev`
3. Στο iPad πήγαινε: `http://192.168.1.100:3000`

**Αν δουλεύει, θα δεις την εφαρμογή!** 🎉


