# 🔄 Migration Instructions - Staff Management

## ⚠️ Important

Αυτό το migration θα **RESET** το database σου. Όλα τα υπάρχοντα δεδομένα θα χαθούν!

## 🚀 Quick Migration (Windows)

**Επιλογή 1: Αυτόματο Script**
```bash
run-migration.bat
```

Αυτό θα:
1. Reset το database
2. Run όλα τα migrations (συμπεριλαμβανομένου του νέου)
3. Generate Prisma Client

---

## 📝 Manual Migration

**Επιλογή 2: Step by Step**

### Βήμα 1: Reset Database
```bash
npx prisma migrate reset --force
```

### Βήμα 2: Run All Migrations
```bash
npx prisma migrate dev --name add_user_team_relationship
```

### Βήμα 3: Generate Prisma Client
```bash
npx prisma generate
```

---

## 🔍 What This Migration Does

1. **Creates `UserTeam` table**
   - Junction table για many-to-many relationship
   - Fields: userId, teamId, role, status, invitedBy

2. **Adds `createdById` to `Team` table**
   - Tracks team owner/creator
   - Foreign key to User

3. **Adds indexes**
   - Performance optimization για queries

---

## ✅ After Migration

1. **Restart dev server** (αν τρέχει)
   ```bash
   npm run dev
   ```

2. **Test Registration**
   - Πήγαινε στο `/auth/register`
   - Συμπλήρωσε club name
   - Θα δημιουργηθεί team αυτόματα

3. **Test Staff Management**
   - Πήγαινε στο `/admin/staff`
   - Δες τον staff
   - Invite άλλον user

---

## 🐛 Troubleshooting

### Error: "EPERM: operation not permitted"
- Κλείσε το dev server
- Κλείσε Prisma Studio (αν ανοιχτό)
- Ξαναπροσπάθησε

### Error: "Database is locked"
- Κλείσε όλα τα tools που χρησιμοποιούν το database
- Ξαναπροσπάθησε

### Error: "Migration failed"
- Check τα logs
- Βεβαιώσου ότι το `.env` έχει σωστό `DATABASE_URL`

---

## 📊 Backup (Optional)

Αν θέλεις να κρατήσεις τα δεδομένα:

1. **Copy το database file:**
   ```bash
   copy prisma\dev.db prisma\dev.db.backup
   ```

2. **Μετά το migration, μπορείς να:**
   - Export data από backup
   - Import στο νέο database
   - (Manual process - χρειάζεται custom script)

---

## ✅ Verification

Μετά το migration, έλεγξε:

```bash
# Open Prisma Studio
npx prisma studio
```

Θα πρέπει να δεις:
- ✅ `UserTeam` table
- ✅ `Team` table με `createdById` field
- ✅ Όλα τα άλλα tables

---

**Ready? Run `run-migration.bat` ή follow manual steps!** 🚀
