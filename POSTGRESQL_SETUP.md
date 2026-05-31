# 🐘 PostgreSQL Setup Guide

## 📋 Τι είναι το PostgreSQL;

Το PostgreSQL είναι μια **ισχυρή βάση δεδομένων** που είναι καλύτερη από το SQLite για:
- ✅ Μεγάλο όγκο δεδομένων (χιλιάδες/εκατομμύρια records)
- ✅ Πολλαπλούς ταυτόχρονους χρήστες
- ✅ Production environments
- ✅ Better performance με indexes

---

## 🎯 Επιλογές Setup

### **Επιλογή 1: Local PostgreSQL (για Development)**

Αν θέλεις να δοκιμάσεις PostgreSQL τοπικά στον υπολογιστή σου:

#### Windows:

**Βήμα 1: Εγκατάσταση PostgreSQL**
1. Πήγαινε στο: https://www.postgresql.org/download/windows/
2. Κάνε download το **PostgreSQL Installer**
3. Τρέξε το installer και ακολούθησε τις οδηγίες
4. Θα σου ζητήσει password για τον `postgres` user - **θυμήσου το!**

**Βήμα 2: Δημιούργησε Database**
1. Άνοιξε **pgAdmin** (έρχεται με το PostgreSQL)
2. Κάνε κλικ δεξιά στο **Databases** → **Create** → **Database**
3. Όνομα: `football_analytics`
4. Κάνε κλικ **Save**

**Βήμα 3: Ρύθμισε το .env**
Άνοιξε το `.env` file και άλλαξε:
```env
# Από SQLite:
# DATABASE_URL="file:./prisma/dev.db"

# Σε PostgreSQL:
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/football_analytics"
```

Αντικατέστησε:
- `YOUR_PASSWORD` με το password που έβαλες κατά την εγκατάσταση
- `football_analytics` με το όνομα του database που έφτιαξες

**Βήμα 4: Άλλαξε το Schema**
Άνοιξε το `prisma/schema.prisma` και άλλαξε:
```prisma
datasource db {
  provider = "postgresql"  // αντί για "sqlite"
  url      = env("DATABASE_URL")
}
```

**Βήμα 5: Τρέξε Migrations**
```bash
npx prisma migrate dev
```

---

### **Επιλογή 2: Cloud PostgreSQL (για Production)**

Για production, χρησιμοποίησε cloud service:

#### **Α) Vercel Postgres (Προτεινόμενη - Εύκολη)**

1. **Πήγαινε στο Vercel:**
   - https://vercel.com
   - Κάνε login

2. **Δημιούργησε Project:**
   - Κάνε κλικ **Add New Project**
   - Σύνδεσε το GitHub repository

3. **Δημιούργησε Database:**
   - Στο project, πήγαινε στο **Storage** tab
   - Κάνε κλικ **Create Database** → **Postgres**
   - Επέλεξε plan (free tier είναι OK για αρχή)

4. **Αντιγράψε το Connection String:**
   - Μετά τη δημιουργία, θα δεις το `DATABASE_URL`
   - Αντιγράψε το

5. **Πρόσθεσε στο Environment Variables:**
   - Πήγαινε στο **Settings** → **Environment Variables**
   - Πρόσθεσε: `DATABASE_URL` = (το connection string που αντέγραψες)

6. **Άλλαξε το Schema:**
   - Στο `prisma/schema.prisma`, άλλαξε:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

7. **Deploy:**
   - Push στο GitHub
   - Το Vercel θα κάνει auto-deploy

8. **Τρέξε Migrations:**
   ```bash
   # Με Vercel CLI
   npm i -g vercel
   vercel login
   vercel link
   npx prisma migrate deploy
   ```

---

#### **Β) Supabase (Δωρεάν - Πολύ καλή επιλογή)**

1. **Δημιούργησε Account:**
   - Πήγαινε στο: https://supabase.com
   - Κάνε **Sign up** (δωρεάν)

2. **Δημιούργησε Project:**
   - Κάνε κλικ **New Project**
   - Όνομα: `football-analytics`
   - Password: (θυμήσου το!)
   - Region: Επέλεξε το πιο κοντινό (π.χ. Europe)

3. **Αντιγράψε Connection String:**
   - Πήγαινε στο **Settings** → **Database**
   - Κάνε scroll down στο **Connection String**
   - Επέλεξε **URI** format
   - Αντιγράψε το (μοιάζει με: `postgresql://postgres:[YOUR-PASSWORD]@...`)

4. **Ρύθμισε το .env:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres"
   ```
   (Αντικατέστησε `YOUR_PASSWORD` με το password που έβαλες)

5. **Άλλαξε το Schema:**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

6. **Τρέξε Migrations:**
   ```bash
   npx prisma migrate dev
   ```

---

#### **Γ) Neon (Δωρεάν - Serverless PostgreSQL)**

1. **Δημιούργησε Account:**
   - Πήγαινε στο: https://neon.tech
   - Κάνε **Sign up**

2. **Δημιούργησε Project:**
   - Κάνε κλικ **Create Project**
   - Όνομα: `football-analytics`
   - PostgreSQL version: 15 ή 16

3. **Αντιγράψε Connection String:**
   - Μετά τη δημιουργία, θα δεις το connection string
   - Αντιγράψε το

4. **Ρύθμισε το .env:**
   ```env
   DATABASE_URL="postgresql://user:password@ep-xxxxx.region.aws.neon.tech/neondb"
   ```

5. **Άλλαξε το Schema και τρέξε migrations** (ίδια διαδικασία)

---

## 🔄 Migration από SQLite σε PostgreSQL

Αν έχεις ήδη δεδομένα στο SQLite και θέλεις να τα μεταφέρεις:

### **Μέθοδος 1: Prisma Migrate (Προτεινόμενη)**

1. **Backup το SQLite database:**
   ```bash
   # Κάνε copy το prisma/dev.db
   copy prisma\dev.db prisma\dev.db.backup
   ```

2. **Άλλαξε το schema σε PostgreSQL:**
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Τρέξε migrations:**
   ```bash
   npx prisma migrate dev
   ```

4. **Μεταφορά δεδομένων (αν χρειάζεται):**
   - Χρησιμοποίησε Prisma Studio ή custom script
   - Ή export/import με CSV

### **Μέθοδος 2: Prisma Studio**

1. **Άνοιξε Prisma Studio για SQLite:**
   ```bash
   # Άλλαξε προσωρινά το .env σε SQLite
   DATABASE_URL="file:./prisma/dev.db"
   npx prisma studio
   ```

2. **Export δεδομένα:**
   - Κάνε export από κάθε table (CSV ή JSON)

3. **Import στο PostgreSQL:**
   - Άλλαξε το .env σε PostgreSQL
   - Άνοιξε Prisma Studio: `npx prisma studio`
   - Import τα δεδομένα

---

## ✅ Επαλήθευση

Μετά το setup, έλεγξε ότι δουλεύει:

```bash
# Generate Prisma Client
npx prisma generate

# Ελέγξε connection
npx prisma db pull

# Άνοιξε Prisma Studio
npx prisma studio
```

Αν ανοίξει το Prisma Studio χωρίς errors, **όλα είναι OK!** ✅

---

## 🆘 Troubleshooting

### **Error: "Connection refused"**
- Έλεγξε ότι το PostgreSQL τρέχει (Windows: Services → PostgreSQL)
- Έλεγξε ότι το port 5432 είναι ανοιχτό
- Έλεγξε το password στο DATABASE_URL

### **Error: "Database does not exist"**
- Δημιούργησε το database πρώτα (pgAdmin ή psql)

### **Error: "Schema is out of sync"**
```bash
npx prisma db push
# ή
npx prisma migrate dev
```

### **Error: "SSL required"**
Για cloud databases (Supabase, Neon), πρόσθεσε στο DATABASE_URL:
```
?sslmode=require
```

Πλήρες format:
```
postgresql://user:password@host:5432/database?sslmode=require
```

---

## 📚 Χρήσιμα Links

- **PostgreSQL Download:** https://www.postgresql.org/download/
- **Vercel Postgres:** https://vercel.com/docs/storage/vercel-postgres
- **Supabase:** https://supabase.com
- **Neon:** https://neon.tech
- **Prisma Docs:** https://www.prisma.io/docs

---

## 🎯 Συνοπτικά

1. **Local:** Εγκατάστησε PostgreSQL → Δημιούργησε database → Άλλαξε .env → Migrate
2. **Cloud:** Δημιούργησε account (Vercel/Supabase/Neon) → Αντιγράψε connection string → Άλλαξε .env → Migrate

**Για production, προτείνω Vercel Postgres ή Supabase!** 🚀
