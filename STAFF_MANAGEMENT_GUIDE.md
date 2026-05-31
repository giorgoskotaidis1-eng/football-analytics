# 👥 Staff Management System - Οδηγίες

## ✅ Τι Προστέθηκε

### 1. **User-Team Relationship (Many-to-Many)**
- Ένας user μπορεί να ανήκει σε **πολλές ομάδες**
- Μια ομάδα μπορεί να έχει **πολλούς staff members**
- Κάθε membership έχει **role** (Head Coach, Analyst, κ.ά.)

### 2. **Βελτιωμένο Register**
- **Role Selection** - Μπορείς να επιλέξεις role κατά τη registration
- **Team Creation** - Αν βάλεις club name, δημιουργείται αυτόματα team
- **Auto-assignment** - Ο user γίνεται αυτόματα member της ομάδας που δημιούργησε

### 3. **Admin Panel για Staff Management**
- **View Staff** - Δες όλους τους staff members
- **Filter by Team** - Φίλτραρε ανά ομάδα
- **Invite Staff** - Προσκάλεσε staff members σε ομάδα
- **Update Roles** - Άλλαξε role ενός staff member
- **Remove Staff** - Αφαίρεσε staff member από ομάδα

### 4. **API Endpoints**
- `GET /api/admin/staff` - List all staff
- `POST /api/admin/staff` - Invite staff member
- `PUT /api/admin/staff/[id]` - Update role
- `DELETE /api/admin/staff/[id]` - Remove member
- `GET /api/admin/teams/[id]/staff` - Get team staff

---

## 🚀 Πώς να το Χρησιμοποιήσεις

### **Βήμα 1: Run Migration**

Πρέπει να τρέξεις migration για τα νέα schema changes:

```bash
npx prisma migrate dev --name add_user_team_relationship
```

Αυτό θα:
- Δημιουργήσει το `UserTeam` table
- Προσθέσει `createdById` στο `Team` model
- Προσθέσει indexes

### **Βήμα 2: Register ως Head Coach**

1. Πήγαινε στο `/auth/register`
2. Συμπλήρωσε:
   - **Name:** Το όνομά σου
   - **Role:** Head Coach (ή άλλο)
   - **Club/Team:** Όνομα ομάδας (π.χ. "PAOK FC")
   - **Email & Password**
3. Κάνε κλικ **Create workspace**

Αυτό θα:
- ✅ Δημιουργήσει user account
- ✅ Δημιουργήσει team
- ✅ Συνδέσει user με team ως Head Coach

### **Βήμα 3: Invite Staff Members**

1. **Πρώτα**, ο staff member πρέπει να κάνει register (χωρίς team)
2. Μετά, πήγαινε στο **Admin Panel** → **Staff**
3. Κάνε κλικ **+ Invite Staff**
4. Συμπλήρωσε:
   - **Email:** Το email του staff member
   - **Team:** Επέλεξε ομάδα
   - **Role:** Analyst, Scout, κ.ά.
5. Κάνε κλικ **Invite**

### **Βήμα 4: Manage Staff**

Στο **Admin Panel** → **Staff** μπορείς να:
- **Δεις όλους τους staff** (ή φίλτραρε ανά team)
- **Άλλαξε role** - Κάνε κλικ στο dropdown
- **Αφαίρεσε member** - Κάνε κλικ **Remove**

---

## 📊 Database Schema

### **UserTeam Table**
```prisma
model UserTeam {
  id        Int
  userId    Int      // Foreign key to User
  teamId    Int      // Foreign key to Team
  role      String?  // Role in this team
  status    String   // "pending", "active", "inactive"
  invitedBy Int?     // Who invited this member
  createdAt DateTime
  updatedAt DateTime
}
```

### **Team Model (Updated)**
```prisma
model Team {
  id          Int
  name        String
  createdById Int?     // Owner/Creator
  createdBy   User?    // Relation to User
  members     UserTeam[] // All staff members
}
```

---

## 🔐 Permissions

### **Who can invite staff?**
- ✅ Team Owner (createdBy)
- ✅ Head Coach members
- ✅ Admin users

### **Who can update roles?**
- ✅ Team Owner
- ✅ Admin users

### **Who can remove members?**
- ✅ Team Owner
- ✅ Admin users
- ✅ Self (μπορείς να αφαιρέσεις τον εαυτό σου)

### **Who can view team staff?**
- ✅ Team members
- ✅ Admin users

---

## 💡 Use Cases

### **Use Case 1: New Club Setup**
1. Head Coach κάνει register με club name
2. System δημιουργεί team και τον προσθέτει ως owner
3. Head Coach invite analysts, scouts, κ.ά.

### **Use Case 2: Multiple Teams**
1. Ένας user μπορεί να είναι Head Coach σε μια ομάδα
2. Και Analyst σε άλλη ομάδα
3. Κάθε membership έχει δικό του role

### **Use Case 3: Staff Collaboration**
1. Staff members μπορούν να στέλνουν messages (υπάρχει ήδη)
2. Μπορούν να βλέπουν τα matches της ομάδας
3. Μπορούν να προσθέτουν comments σε players/matches

---

## 🐛 Troubleshooting

### **Error: "User not found. They need to register first."**
- Ο staff member πρέπει πρώτα να κάνει register
- Μετά μπορείς να τον invite

### **Error: "You don't have permission"**
- Βεβαιώσου ότι είσαι team owner ή admin
- Check το role σου

### **Error: "User is already a member"**
- Ο user είναι ήδη member της ομάδας
- Μπορείς να αλλάξεις το role του

---

## 🎯 Next Steps (Optional)

Μπορείς να προσθέσεις:
1. **Email Invitations** - Αυτόματο email όταν invite staff
2. **Pending Invitations** - System για pending invites
3. **Team Settings** - Permissions per team
4. **Activity Log** - Track staff actions

---

## ✅ Summary

Τώρα έχεις:
- ✅ **Proper team-staff relationship**
- ✅ **Role management**
- ✅ **Admin panel για staff**
- ✅ **Invite system**
- ✅ **Multiple teams support**

**Το sign in δεν είναι πια basic - έχει full team & role management!** 🎉
