# Οδηγίες για Setup στο Mac

## 1. Clone το Repository

Ανοίξε Terminal στο Mac και τρέξε:

```bash
cd ~/Desktop  # ή όπου θέλεις να το βάλεις
git clone https://github.com/giorgoskotaidis1-eng/football-analytics.git
cd football-analytics
```

## 2. Εγκατάσταση Dependencies

```bash
# Εγκατάσταση Node.js dependencies
npm install

# Εγκατάσταση Python dependencies (αν χρειάζεται)
pip3 install -r requirements.txt
```

## 3. Δημιουργία .env File

Δημιούργησε ένα `.env` file στο root directory:

```bash
touch .env
```

**ΠΡΟΣΟΧΗ:** Πρέπει να προσθέσεις το `DATABASE_URL`! Άνοιξε το `.env` file:

```bash
nano .env
# ή
open -e .env
# ή
code .env  # αν έχεις VS Code
```

Πρόσθεσε αυτές τις μεταβλητές (OBLIGATORY):

```env
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="change-this-to-a-random-string-in-production"
NEXTAUTH_URL="http://localhost:3000"
```

**Γρήγορη λύση - Copy/Paste αυτό:**
```bash
cat > .env << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="dev-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
EOF
```

Αντιγράψε-επικόλλησε το παραπάνω block στο Terminal.

## 4. Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations (αν χρειάζεται)
npx prisma migrate dev

# Δημιούργησε default user για login
npm run create-user
```

**⚠️ IMPORTANT:** Μετά το `npm run create-user`, θα δημιουργηθεί ένας default user:
- **Email:** `admin@football.com`
- **Password:** `admin123`

Μπορείς να συνδεθείς με αυτά τα credentials. **Αλλάξε το password μετά το πρώτο login!**

## 5. Ξεκίνα το Development Server

```bash
npm run dev
```

Το app θα ανοίξει στο: **http://localhost:3000**

## 6. Αν χρειάζεται να κάνεις Pull Updates

```bash
git pull origin main
npm install  # αν προστέθηκαν νέα packages
```

## Troubleshooting

### Αν δεν έχεις Node.js:
```bash
# Με Homebrew
brew install node

# Ή κατέβασε από https://nodejs.org
```

### Αν δεν έχεις Git:
```bash
# Με Homebrew
brew install git

# Ή με Xcode Command Line Tools
xcode-select --install
```

### Αν έχεις πρόβλημα με Prisma:
```bash
npx prisma generate --schema=./prisma/schema.prisma
```

## Features που είναι διαθέσιμα:

✅ Match Dynamics - Charts και KPIs  
✅ Pass Network - Network visualization  
✅ Vector Field - Movement vectors  
✅ Event Post-processing - Intelligent filtering  
✅ Video Player - Enhanced playback  
✅ Activity Field - Heatmaps  

Όλα είναι στο repository!

