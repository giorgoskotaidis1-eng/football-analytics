# 🚀 Οδηγίες Deployment στο Vercel

## Βήμα 1: Κάνε το Repository Public (για να το δεις)

1. Πήγαινε στο: https://github.com/giorgoskotaidis1-eng/football-analytics
2. Κάνε **Sign in** στο GitHub
3. Πήγαινε στο **Settings** → **General** → **Danger Zone**
4. Κάνε κλικ στο **Change visibility** → **Make public**

---

## Βήμα 2: Deployment στο Vercel

### 2.1 Σύνδεση με Vercel

1. Πήγαινε στο: https://vercel.com
2. Κάνε **Sign up** ή **Sign in** (μπορείς να συνδεθείς με GitHub)
3. Κάνε κλικ στο **Add New Project**
4. Επέλεξε το repository: `giorgoskotaidis1-eng/football-analytics`

### 2.2 Ρύθμιση Environment Variables

Στο Vercel, πρόσθεσε αυτές τις μεταβλητές:

**OBLIGATORY:**
```
DATABASE_URL=postgresql://user:password@host:5432/database
JWT_SECRET=your-super-secret-key-min-32-chars
NEXTAUTH_URL=https://your-app-name.vercel.app
```

**OPTIONAL (για email):**
```
RESEND_API_KEY=your-resend-api-key
FROM_EMAIL=onboarding@resend.dev
APP_NAME=Football Analytics
APP_URL=https://your-app-name.vercel.app
```

### 2.3 Database Setup (PostgreSQL)

Το SQLite δεν δουλεύει στο Vercel. Χρειάζεσαι PostgreSQL:

**Επιλογή Α: Vercel Postgres (Προτεινόμενη)**
1. Στο Vercel project, πήγαινε στο **Storage** tab
2. Κάνε κλικ **Create Database** → **Postgres**
3. Αφού δημιουργηθεί, αντιγράψε το `DATABASE_URL` και πρόσθεσέ το στα Environment Variables

**Επιλογή Β: Supabase (Δωρεάν)**
1. Πήγαινε στο: https://supabase.com
2. Δημιούργησε νέο project
3. Πήγαινε στο **Settings** → **Database**
4. Αντιγράψε το **Connection String** (URI format)
5. Πρόσθεσέ το στο Vercel ως `DATABASE_URL`

**Επιλογή Γ: Neon (Δωρεάν)**
1. Πήγαινε στο: https://neon.tech
2. Δημιούργησε νέο project
3. Αντιγράψε το **Connection String**
4. Πρόσθεσέ το στο Vercel ως `DATABASE_URL`

### 2.4 Build Settings

Το Vercel θα εντοπίσει αυτόματα ότι είναι Next.js project. Αλλά βεβαιώσου ότι:

- **Framework Preset:** Next.js
- **Build Command:** `npm run build` (default)
- **Output Directory:** `.next` (default)
- **Install Command:** `npm install` (default)

### 2.5 Deploy

1. Κάνε κλικ στο **Deploy**
2. Περίμενε 2-3 λεπτά για το build
3. Όταν ολοκληρωθεί, θα πάρεις ένα link: `https://your-app-name.vercel.app`

---

## Βήμα 3: Database Migrations

Μετά το πρώτο deploy, τρέξε migrations:

**Επιλογή Α: Vercel CLI**
```bash
npm i -g vercel
vercel login
vercel link
npx prisma migrate deploy
```

**Επιλογή Β: Vercel Dashboard**
1. Πήγαινε στο **Deployments** tab
2. Κάνε κλικ στο **...** → **Redeploy**
3. Στο **Environment Variables**, πρόσθεσε:
   ```
   PRISMA_MIGRATE=true
   ```

---

## Βήμα 4: Δημιουργία Default User

Μετά το deploy, χρειάζεται να δημιουργήσεις admin user:

1. Άνοιξε το Vercel project
2. Πήγαινε στο **Functions** → **Logs**
3. Κάνε κλικ στο **View Function Logs**
4. Τρέξε manual API call:
   ```
   POST https://your-app-name.vercel.app/api/admin/create-user
   ```

**Ή** χρησιμοποίησε Vercel CLI:
```bash
vercel env pull .env.local
npm run create-user
```

---

## 🔗 Links

- **GitHub Repository:** https://github.com/giorgoskotaidis1-eng/football-analytics
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Vercel Postgres:** https://vercel.com/docs/storage/vercel-postgres
- **Supabase:** https://supabase.com
- **Neon:** https://neon.tech

---

## ⚠️ Troubleshooting

### Build Fails
- Έλεγξε τα **Build Logs** στο Vercel
- Βεβαιώσου ότι όλα τα environment variables είναι set
- Έλεγξε ότι το `DATABASE_URL` είναι σωστό

### Database Connection Error
- Έλεγξε ότι το `DATABASE_URL` είναι σωστό
- Βεβαιώσου ότι το database είναι accessible (public IP)
- Έλεγξε τα firewall rules

### 404 Errors
- Έλεγξε ότι το `NEXTAUTH_URL` είναι σωστό
- Βεβαιώσου ότι το `vercel.json` είναι σωστό

---

## ✅ Μετά το Deploy

1. **Test το deployment:** Άνοιξε το link που σου έδωσε το Vercel
2. **Check logs:** Πήγαινε στο **Functions** → **Logs** για errors
3. **Update README:** Πρόσθεσε το deployment link στο README.md

---

**Τέλος!** Τώρα μπορείς να δείξεις την εφαρμογή με link! 🎉


