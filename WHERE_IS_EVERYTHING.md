# 📁 Where Everything Is Located

## 🎯 Analytics System (xG, Shots, Possession, Heatmap)

### Core Files:
- **`prisma/schema.prisma`** - Database schema (MatchEvent model added)
- **`src/lib/analytics.ts`** - ⭐ Analytics calculations (xG, possession, heatmap)
- **`src/app/components/Heatmap.tsx`** - Heatmap visualization component

### API Routes:
- **`src/app/api/matches/[id]/analytics/route.ts`** - Get all analytics for a match
- **`src/app/api/matches/[id]/events/route.ts`** - Get/Create match events

### Documentation:
- **`ANALYTICS_SETUP.md`** - Complete setup guide

---

## 📧 Email Service

### Core Files:
- **`src/lib/email.ts`** - ⭐ Email service with Resend integration
  - Welcome emails
  - Email verification
  - Password reset
  - Payment receipts
  - Payment failures

### API Routes Updated:
- **`src/app/api/notifications/welcome/route.ts`** - Sends welcome emails
- **`src/app/api/auth/register/route.ts`** - Sends verification emails
- **`src/app/api/auth/forgot-password/route.ts`** - Sends reset emails
- **`src/app/api/notifications/payment/receipt/route.ts`** - Payment receipts
- **`src/app/api/notifications/payment/failure/route.ts`** - Payment failures

### Documentation:
- **`EMAIL_SETUP.md`** - Email setup instructions
- **`UPDATE_ENV_EMAIL.bat`** - Batch file to add email config to .env

---

## 🗄️ Database & Migrations

- **`prisma/schema.prisma`** - Main database schema
- **`prisma/migrations/`** - All database migrations
- **`src/lib/prisma.ts`** - Prisma client

---

## 🔐 Authentication & Session

- **`src/lib/auth.ts`** - JWT session management
- **`src/lib/api-auth.ts`** - API authentication middleware
- **`src/app/api/auth/`** - All auth routes (login, register, etc.)

---

## 📊 Main Application Pages

- **`src/app/page.tsx`** - Dashboard/home page
- **`src/app/players/page.tsx`** - Players list
- **`src/app/players/[id]/page.tsx`** - Player detail
- **`src/app/matches/page.tsx`** - Matches list
- **`src/app/matches/[id]/page.tsx`** - Match detail (where analytics will show)
- **`src/app/teams/page.tsx`** - Teams list

---

## 🎨 Components

- **`src/app/components/HeaderUserArea.tsx`** - User menu in header
- **`src/app/components/Heatmap.tsx`** - Heatmap visualization
- **`src/app/components/LanguageToggle.tsx`** - Language switcher

---

## 📝 Documentation Files

- **`ANALYTICS_SETUP.md`** - Analytics setup guide
- **`EMAIL_SETUP.md`** - Email service setup
- **`PROFESSIONAL_IMPROVEMENTS.md`** - Future improvements plan
- **`QUICK_IMPROVEMENTS.md`** - Quick wins list
- **`WHERE_IS_EVERYTHING.md`** - This file!

---

## 🛠️ Setup Scripts

- **`RUN_APP.bat`** - Start the app
- **`START_SERVER.bat`** - Start dev server
- **`UPDATE_ENV_EMAIL.bat`** - Add email config
- **`CREATE_ENV_PROPERLY.bat`** - Create .env file
- **`install-jose.bat`** - Install dependencies

---

## 🔑 Key Files to Know

### Most Important:
1. **`src/lib/analytics.ts`** - All analytics calculations
2. **`src/lib/email.ts`** - Email sending
3. **`prisma/schema.prisma`** - Database structure
4. **`src/app/api/matches/[id]/analytics/route.ts`** - Analytics API

### Configuration:
- **`.env`** - Environment variables (DATABASE_URL, JWT_SECRET, RESEND_API_KEY)
- **`package.json`** - Dependencies
- **`next.config.ts`** - Next.js config

---

## 🚀 Quick Access

**To see analytics in action:**
1. Run migration: `npx prisma migrate dev --name add_match_events_analytics`
2. Add events via API: `POST /api/matches/[id]/events`
3. View analytics: `GET /api/matches/[id]/analytics`
4. Check match detail page: `/matches/[id]`

**To use email service:**
1. Get Resend API key from resend.com
2. Add to `.env`: `RESEND_API_KEY=your_key`
3. Emails will send automatically on registration, password reset, etc.

---

**Everything is organized and ready to use!** 🎉

