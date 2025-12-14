# 🚀 Deploy Demo Online - Access from Anywhere

## 🎯 Στόχος

Να κάνεις deploy το demo online ώστε να είναι accessible από **οπουδήποτε** (όχι μόνο στο ίδιο WiFi).

---

## 🌐 Option 1: Deploy to Vercel (Recommended - FREE)

### Step 1: Push to GitHub

1. **Create GitHub repository:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/football-analytics-app.git
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Go to:** https://vercel.com
2. **Sign up** (free) με GitHub account
3. **Click "New Project"**
4. **Import** το repository σου
5. **Configure:**
   - Framework Preset: **Next.js**
   - Root Directory: `./` (default)
   - Build Command: `npm run build`
   - Output Directory: `.next`
6. **Environment Variables:** (Optional - για full app)
   - `DATABASE_URL` (αν θέλεις database)
   - `JWT_SECRET` (αν θέλεις auth)
7. **Click "Deploy"**

### Step 3: Access Demo

- Μετά το deploy, θα πάρεις ένα URL: `https://your-app.vercel.app`
- **Demo URL:** `https://your-app.vercel.app/demo`
- **Share this URL** - δουλεύει από παντού!

---

## 🌐 Option 2: Deploy to Netlify (FREE)

### Step 1: Push to GitHub
(Same as Vercel)

### Step 2: Deploy to Netlify

1. **Go to:** https://netlify.com
2. **Sign up** (free) με GitHub account
3. **Click "Add new site" → "Import an existing project"**
4. **Select** το repository σου
5. **Configure:**
   - Build command: `npm run build`
   - Publish directory: `.next`
6. **Click "Deploy site"**

### Step 3: Access Demo

- URL: `https://your-app.netlify.app`
- **Demo URL:** `https://your-app.netlify.app/demo`

---

## 📱 Option 3: Static Export (Fully Offline)

Αν θέλεις να κάνεις **static export** που μπορείς να share ως files:

### Step 1: Update next.config.ts

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Enable static export
  images: {
    unoptimized: true,  // Required for static export
  },
};

export default nextConfig;
```

### Step 2: Build Static Export

```bash
npm run build
```

### Step 3: Find Export

- Files θα είναι στο `out/` folder
- Μπορείς να τα share/upload anywhere

---

## 🎯 Quick Deploy (Vercel CLI)

### Install Vercel CLI

```bash
npm i -g vercel
```

### Deploy

```bash
vercel
```

Follow prompts:
- Link to existing project? **No**
- Project name: `football-analytics-demo`
- Directory: `./`
- Override settings? **No**

### Get URL

- Θα πάρεις URL: `https://football-analytics-demo.vercel.app`
- **Demo:** `https://football-analytics-demo.vercel.app/demo`

---

## ✅ After Deployment

### 1. **Test Demo**
- Open: `https://your-app.vercel.app/demo`
- Test όλα τα tabs
- Verify ότι δουλεύει offline (install as PWA)

### 2. **Share URL**
- Share το demo URL με οποιονδήποτε
- Δουλεύει από **οπουδήποτε** (όχι μόνο ίδιο WiFi)

### 3. **Install as PWA**
- Open demo URL στο iPad
- Share → Add to Home Screen
- Works **completely offline**!

---

## 🔧 Troubleshooting

### Build Fails
- Check για TypeScript errors
- Verify όλα τα imports είναι correct
- Check console για errors

### Demo Not Loading
- Verify `/demo` route exists
- Check browser console
- Verify components are imported correctly

### PWA Not Working
- Verify `manifest.json` exists
- Check `sw.js` is accessible
- Verify HTTPS (required for PWA)

---

## 💡 Pro Tips

1. **Custom Domain** (Optional)
   - Vercel/Netlify allow custom domains
   - Add: `demo.yourdomain.com`

2. **Environment Variables**
   - Demo δεν χρειάζεται database
   - Μπορείς να deploy **without** env vars

3. **Auto-Deploy**
   - Push to GitHub → Auto-deploy
   - Every commit = new deployment

---

## 🎉 Result

Μετά το deploy:
- ✅ Demo accessible από **οπουδήποτε**
- ✅ Works **offline** (PWA)
- ✅ Share URL με **οποιονδήποτε**
- ✅ Professional presentation

**Demo URL:** `https://your-app.vercel.app/demo`

---

**Ready to deploy!** 🚀

Choose Vercel (easiest) or Netlify and deploy your demo!

