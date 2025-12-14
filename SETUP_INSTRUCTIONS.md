# Οδηγίες Setup

## Βήμα 1: Δημιούργησε το .env file

**Επιλογή Α (Πιο εύκολο):**
Κάνε διπλό κλικ στο `auto-create-env.bat` - θα δημιουργήσει το .env και θα τρέξει το migration!

**Επιλογή Β:**
Τρέξε στο terminal:
```
npm run setup-env
```

**Επιλογή Γ (Χειροκίνητα):**
1. Άνοιξε Notepad
2. Γράψε:
```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key-change-this-in-production"
```
3. Αποθήκευσε ως `.env` (με τελεία!) στον φάκελο του project

## Βήμα 2: Τρέξε το migration

Αφού δημιουργηθεί το .env, τρέξε:
```
npx prisma migrate dev --name add_message_comment_relations
```

ή

```
npm run migrate -- --name add_message_comment_relations
```

---

**ΣΗΜΑΝΤΙΚΟ:** Το `.env` file πρέπει να είναι στον root φάκελο: `C:\Users\troll\CascadeProjects\football-analytics-app\.env`

