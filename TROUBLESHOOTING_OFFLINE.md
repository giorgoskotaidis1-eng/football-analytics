# 🔧 Troubleshooting - Offline iPad

## ❌ "Δεν δουλεύει" - Common Problems & Solutions

### **1. Service Worker δεν Register**

**Symptoms:**
- Console: "❌ Service Worker registration failed"
- No "✅ Service Worker registered" message

**Solutions:**

**A. Clear Browser Cache:**
```
iPad Safari:
1. Settings → Safari → Clear History and Website Data
2. Refresh page
```

**B. Check HTTPS/localhost:**
- Service Workers work ONLY on:
  - ✅ `https://` (production)
  - ✅ `http://localhost` (development)
  - ✅ `http://127.0.0.1` (development)
  - ❌ `http://192.168.x.x` (NOT supported on iPad Safari!)

**C. Verify sw.js is accessible:**
```
1. Open Safari on iPad
2. Go to: http://YOUR_IP:3000/sw.js
3. Should see JavaScript code (not 404)
```

**D. Check Console Errors:**
```
1. Connect iPad to Mac
2. Mac Safari → Develop → [Your iPad] → [Your Page]
3. Check Console for errors
```

---

### **2. PWA Installation δεν δουλεύει**

**Symptoms:**
- "Add to Home Screen" button missing
- Tap "Add" but nothing happens

**Solutions:**

**A. Check Manifest:**
```
1. Go to: http://YOUR_IP:3000/manifest.json
2. Should see valid JSON (not 404)
```

**B. Check HTTPS:**
- iPad Safari requires HTTPS for PWA (except localhost)
- **Solution:** Deploy to Vercel/Netlify (free HTTPS)

**C. Clear Safari Data:**
```
Settings → Safari → Clear History and Website Data
```

---

### **3. Offline Mode δεν δουλεύει**

**Symptoms:**
- Close WiFi → App doesn't load
- Shows "No Internet" error

**Solutions:**

**A. Visit pages ONLINE first:**
```
1. Open app WITH internet
2. Visit: /demo, /matches, /players
3. Wait for pages to load (cache them)
4. THEN close WiFi
5. Open app → Should work!
```

**B. Check Service Worker is Active:**
```
1. Connect iPad to Mac
2. Mac Safari → Develop → [Your iPad] → [Your Page]
3. Application → Service Workers
4. Should see "Active" status
```

**C. Check Cache:**
```
1. Mac Safari → Develop → [Your iPad] → [Your Page]
2. Application → Cache Storage
3. Should see: football-analytics-v3
```

---

### **4. Demo Page δεν φορτώνει**

**Symptoms:**
- `/demo` shows blank page
- Components don't render

**Solutions:**

**A. Visit /demo ONLINE first:**
```
1. Open: http://YOUR_IP:3000/demo
2. Wait for full page load
3. Check console for errors
4. THEN close WiFi
```

**B. Check Console Errors:**
```
1. Connect iPad to Mac
2. Mac Safari → Develop → Console
3. Look for JavaScript errors
```

**C. Verify Components:**
```
- Check if Heatmap component loads
- Check if PlayerRadarChart loads
- Check if all sample data is present
```

---

### **5. Local Network Issues (iPad can't connect)**

**Symptoms:**
- Can't access `http://YOUR_IP:3000` on iPad
- Connection timeout

**Solutions:**

**A. Check Same WiFi:**
```
1. Computer and iPad MUST be on same WiFi
2. Check WiFi name matches
```

**B. Check Firewall:**
```
Windows:
1. Windows Defender Firewall
2. Allow Node.js through firewall
3. Or temporarily disable firewall
```

**C. Check IP Address:**
```
Windows: ipconfig → IPv4 Address
Mac: ifconfig | grep inet
Use EXACT IP (e.g., 192.168.1.100)
```

**D. Use localhost (if on same device):**
```
If testing on Mac with iPad simulator:
Use: http://localhost:3000/demo
```

---

### **6. Best Solution: Deploy Online**

**Why:**
- ✅ HTTPS (required for PWA on iPad)
- ✅ Works from anywhere
- ✅ No network configuration needed
- ✅ Professional URL

**How:**
```
1. See DEPLOY_DEMO.md
2. Deploy to Vercel (free)
3. Get URL: https://your-app.vercel.app/demo
4. Open on iPad → Works perfectly!
```

---

## ✅ Quick Diagnostic Checklist

Run through these:

- [ ] Service Worker file exists: `/public/sw.js`
- [ ] Manifest file exists: `/public/manifest.json`
- [ ] PWARegister component in layout
- [ ] App running: `npm run dev`
- [ ] iPad on same WiFi (for local)
- [ ] HTTPS (for production/PWA)
- [ ] Pages visited online first (for cache)
- [ ] Console checked for errors
- [ ] Service Worker shows "Active"
- [ ] Cache shows entries

---

## 🎯 Most Common Issue

**"iPad Safari doesn't support Service Workers on HTTP (non-localhost)"**

**Solution:**
1. **Deploy to Vercel** (free, HTTPS)
2. **OR** Use Mac with iPad Simulator (localhost works)
3. **OR** Use Chrome on iPad (less strict)

---

## 📞 Still Not Working?

**Check these in order:**

1. **Console Errors** (most important!)
   - Connect iPad to Mac
   - Safari → Develop → Console
   - Look for red errors

2. **Service Worker Status**
   - Safari → Develop → Application → Service Workers
   - Should be "Active"

3. **Network Tab**
   - Safari → Develop → Network
   - Check if `/sw.js` loads (200 OK)

4. **Cache Storage**
   - Safari → Develop → Application → Cache Storage
   - Should see cache entries

---

**Need more help?** Check console logs and share the error message!

