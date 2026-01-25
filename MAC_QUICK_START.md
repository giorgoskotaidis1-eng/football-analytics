# 🚀 Quick Start για Mac

## 1. Κάνε Pull τις αλλαγές (αν δεν έχεις)

```bash
cd ~/football-analytics/football-analytics
git pull origin main
```

## 2. Δημιούργησε το .env file (αν λείπει)

```bash
cat > .env << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="dev-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
EOF
```

## 3. Setup Database

```bash
# Generate Prisma Client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

## 4. Δημιούργησε Default User

```bash
npm run create-user
```

Αυτό θα δημιουργήσει:
- **Email:** `admin@football.com`
- **Password:** `admin123`

## 5. Ελέγξε αν δημιουργήθηκε ο user

```bash
npm run check-users
```

**⚠️ ΠΡΟΣΟΧΗ:** Χρησιμοποίησε `check-users` με **hyphen** (όχι space)!

## 6. Ξεκίνα το App

```bash
npm run dev
```

## 7. Συνδέσου

Άνοιξε: http://localhost:3000

- **Email:** `admin@football.com`
- **Password:** `admin123`

---

## Troubleshooting

### Αν λείπει script:
```bash
git pull origin main
npm install
```

### Αν δεν μπορείς να συνδεθείς:
```bash
# Ελέγξε users
npm run check-users

# Αν δεν υπάρχουν, δημιούργησε
npm run create-user
```

### Αν λείπει .env:
```bash
cat > .env << 'EOF'
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="dev-secret-key-change-in-production"
NEXTAUTH_URL="http://localhost:3000"
EOF
```

### Αν έχεις Prisma errors:
```bash
npx prisma generate
npx prisma migrate dev
```

---

## Available Scripts

```bash
npm run dev              # Start development server
npm run check-env         # Check .env file contents
npm run check-users       # Check users in database
npm run create-user       # Create default admin user
npm run migrate           # Run database migrations
```

**💡 Remember:** Χρησιμοποίησε **hyphen** (-) όχι space!




