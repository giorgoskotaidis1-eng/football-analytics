# ⚽ Football Analytics App

Professional football analytics platform with AI-powered video analysis, player statistics, match insights, and team management.

## 🚀 Quick Start

### Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Setup Environment

```bash
npm run setup-env
# or on Mac
npm run setup-env-mac
```

## 📦 Features

- **AI Video Analysis** - Automatic event detection from match videos
- **Player Statistics** - Auto-calculated stats from match events
- **Admin Panel** - Complete team and player management
- **Player Dashboard** - Individual player profiles with highlights and heatmaps
- **Match Analysis** - Detailed match insights and analytics
- **Real-time Updates** - Live statistics and event tracking

## 🔗 Links

- **GitHub Repository:** https://github.com/giorgoskotaidis1-eng/football-analytics
- **Deployment Guide:** See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

## 🚀 Deploy on Vercel

The easiest way to deploy is using [Vercel](https://vercel.com):

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables (see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md))
4. Deploy!

For detailed deployment instructions, see [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - How to deploy to Vercel
- [Mac Setup](./MAC_QUICK_START.md) - Setup instructions for Mac
- [Email Setup](./EMAIL_SETUP.md) - Email configuration
- [Billing Setup](./BILLING_SETUP.md) - Stripe Checkout / Billing Portal / webhook

## 🛠️ Tech Stack

- **Framework:** Next.js 16
- **Database:** Prisma + SQLite (dev) / PostgreSQL (production)
- **Styling:** Tailwind CSS
- **Authentication:** JWT
- **Video Processing:** FFmpeg
- **AI/ML:** Custom YOLO models for event detection

## 🐘 PostgreSQL Setup

Για production ή μεγάλο όγκο δεδομένων, χρησιμοποίησε PostgreSQL:

- **📖 Οδηγίες:** [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md)
- **🚀 Quick Switch:** 
  - Windows: `switch-to-postgres.bat`
  - Mac/Linux: `./switch-to-postgres.sh`

**Cloud Options:**
- Vercel Postgres (προτεινόμενο)
- Supabase (δωρεάν)
- Neon (δωρεάν)

## 📝 License

Private project - All rights reserved
