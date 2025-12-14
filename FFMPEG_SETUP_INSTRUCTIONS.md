# 🎬 FFmpeg Setup - Οδηγίες

## ⚠️ Το folder που έχεις είναι "ffmpeg-tools"

Το folder `ffmpeg-tools-2025-01-01-git-d3aa99a4f4` περιέχει **μόνο tools**, όχι το `ffmpeg.exe`.

## ✅ Λύση: Κατέβασε το "ffmpeg-release-essentials"

### Βήμα 1: Download
1. Πήγαινε: **https://www.gyan.dev/ffmpeg/builds/**
2. Κάνε click στο **"ffmpeg-release-essentials.zip"** (τελευταία έκδοση)
3. Κατέβασε το zip file

### Βήμα 2: Extract
1. Extract το zip file
2. Μπες στο extracted folder
3. Βρες το folder `bin` που περιέχει το `ffmpeg.exe`

### Βήμα 3: Copy στο C:\ffmpeg\bin
1. Αντιγράψε **όλο το περιεχόμενο** του `bin` folder σε:
   ```
   C:\ffmpeg\bin\
   ```
2. Βεβαιώσου ότι το `ffmpeg.exe` είναι στο:
   ```
   C:\ffmpeg\bin\ffmpeg.exe
   ```

### Βήμα 4: Προσθήκη στο PATH
1. Windows + R → `sysdm.cpl` → Enter
2. **Advanced** → **Environment Variables**
3. **User variables** → **Path** → **Edit**
4. Αν υπάρχει `C:\ffmpeg`, αφαίρεσέ το
5. **New** → `C:\ffmpeg\bin`
6. **OK** → **OK** → **OK**

### Βήμα 5: Επαλήθευση
Άνοιξε **ΝΕΟ** PowerShell (κλείσε το τρέχον) και τρέξε:

```powershell
ffmpeg -version
```

Αν δεις την έκδοση, είναι έτοιμο! ✅

---

## 🚀 Μετά την εγκατάσταση

Κάνε **restart** το Next.js server:

```powershell
# Stop (Ctrl+C)
npm run dev
```

---

## 📝 Σημείωση

Το `ffmpeg-tools` folder που έχεις **δεν περιέχει** το `ffmpeg.exe`. Χρειάζεσαι το **"essentials"** build που περιέχει όλα τα executables.




