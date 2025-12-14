# 🔧 Quick Fix για iPad Connection

## Το πρόβλημα: "refused to connect"

Αυτό σημαίνει ότι το **Firewall block** την σύνδεση.

## ✅ Λύση:

### Μέθοδος 1: Με το batch file (Εύκολο)
1. Κάνε double-click το **`FIX_IPAD_CONNECTION.bat`**
2. Θα ανοίξει το firewall και θα ξεκινήσει ο server

### Μέθοδος 2: Χειροκίνητα

**Βήμα 1: Άνοιξε το Firewall**
1. Windows Security → Firewall & network protection
2. Advanced settings
3. Inbound Rules → New Rule
4. Port → Next
5. TCP → Specific local ports: `3000` → Next
6. Allow the connection → Next
7. Check all (Domain, Private, Public) → Next
8. Name: "Node.js Port 3000" → Finish

**Βήμα 2: Τρέξε τον server**
```cmd
npm run dev
```

**Βήμα 3: Δοκίμασε στο iPad**
```
http://192.168.2.7:3000
```

---

## ⚠️ Σημαντικό:

1. **Ο server ΠΡΕΠΕΙ να τρέχει** - Βεβαιώσου ότι βλέπεις `- Local: http://localhost:3000`
2. **Το iPad ΠΡΕΠΕΙ να είναι στο ίδιο WiFi** - 192.168.2.x network
3. **Χρησιμοποίησε το LOCAL IP** - 192.168.2.7 (όχι το public IP)

---

## 🎯 Test στον υπολογιστή πρώτα:

Πριν δοκιμάσεις στο iPad, δοκίμασε στον browser του υπολογιστή:
```
http://192.168.2.7:3000
```

Αν **ΔΕΝ** ανοίγει ούτε εκεί, το πρόβλημα είναι στο server ή firewall.

---

## 🔥 Αν τίποτα δεν δουλεύει:

Δοκίμασε διαφορετικό port:
```cmd
npm run dev -- -p 3001
```

Και στο iPad:
```
http://192.168.2.7:3001
```


