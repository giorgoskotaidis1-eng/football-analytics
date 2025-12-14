# Πώς να δημιουργήσεις το .env file

## Μέθοδος 1: Με το batch file (ΠΙΟ ΕΥΚΟΛΟ)
Κάνε διπλό κλικ στο `fix-env.bat` - θα δημιουργήσει το .env file αυτόματα.

## Μέθοδος 2: Χειροκίνητα

1. Άνοιξε το **Notepad** (ή οποιοδήποτε text editor)

2. Γράψε αυτές τις 2 γραμμές:
```
DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET="your-secret-key-change-this-in-production"
```

3. Αποθήκευσε το αρχείο ως `.env` (με την τελεία μπροστά!)
   - Στο Notepad: File → Save As
   - File name: `.env` (με την τελεία!)
   - Save as type: All Files (*.*)
   - Location: `C:\Users\troll\CascadeProjects\football-analytics-app\`

4. Μετά τρέξε:
```
npx prisma migrate dev --name add_message_comment_relations
```

## Ελέγχος
Μετά τη δημιουργία, βεβαιώσου ότι υπάρχει το αρχείο `.env` στον φάκελο του project.

