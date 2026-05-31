# 🐛 Debug Teams Visibility

## 🔍 How to Debug

### 1. Check Server Console
After creating a team, check server console for:
```
[teams.POST] Created team "Team Name" (ID: X) for user Y
[teams.POST] UserTeam membership created... (or warning if table doesn't exist)
```

### 2. Check Browser Console
Go to `/admin/settings` and check console for:
```
[AdminSettings] Loaded teams: X
```

### 3. Check GET Endpoint
When loading teams, check server console for:
```
[teams.GET] User X (email@example.com) has Y teams:
  - Z from UserTeam memberships
  - W created teams
  - Team names: Team1, Team2, ...
```

---

## 🔧 Common Issues

### Issue 1: UserTeam Table Doesn't Exist
**Symptom:** Teams created but not visible
**Solution:** Run migration:
```bash
npx prisma migrate dev
npx prisma generate
```

### Issue 2: createdById Not Set
**Symptom:** Teams created but not visible
**Check:** 
```sql
SELECT id, name, createdById FROM Team;
```
**Fix:** Ensure POST endpoint sets `createdById: user.id`

### Issue 3: Cache Issues
**Symptom:** Teams appear after refresh
**Solution:** Already fixed with cache busting (`?t=timestamp`)

---

## ✅ What's Fixed

1. ✅ GET endpoint - Robust error handling (works even if UserTeam doesn't exist)
2. ✅ POST endpoint - Logging added
3. ✅ Admin settings - Cache busting + logging
4. ✅ Teams page - Instant update + cache busting

---

## 🧪 Test Now

1. Create a team
2. Check server console for logs
3. Check browser console for logs
4. Team should appear immediately

**If still not working, check the logs!** 📊
