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
- **AI Assistant Demo Mode** - Chatbot UI works without paid API billing while testing
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

---

## 🤖 AI Assistant (chatbot with memory)

An AI-powered chat assistant is built into the app at `/assistant`. It answers football analytics questions, remembers useful context per user, and keeps all data strictly partitioned per user.

### Demo mode first, paid AI later

The assistant now has a safe demo fallback.

- If `OPENAI_API_KEY` is missing, `/assistant` still works.
- Conversations and chat messages are still saved to the database.
- The assistant returns a clear demo response instead of crashing.
- Memory summarisation is skipped in demo mode so fake demo text is not saved as a long-term memory.
- When you later add a real OpenAI API key, the same feature automatically starts using the real model.

For demo testing, set this environment variable:

```bash
AI_ASSISTANT_DEMO_MODE=true
```

When you are ready for real AI responses, change it to:

```bash
AI_ASSISTANT_DEMO_MODE=false
```

Then add your OpenAI API key as an environment variable named:

```bash
OPENAI_API_KEY
```

Do not commit the actual key to GitHub.

### 1. Database migration

After pulling this branch, apply the new Prisma models (`Conversation`, `ChatMessage`, `MemoryItem`) to your database:

```bash
# Recommended for local development:
npx prisma migrate dev

# For production/deployed database:
npx prisma migrate deploy

# Regenerate the Prisma client after schema changes:
npx prisma generate
```

### 2. Optional model setting

The default chat model is `gpt-4o-mini`. You can override it with:

```bash
OPENAI_MODEL=gpt-4o-mini
```

### 3. How the memory system works

- **Per-conversation history**: every user message and assistant reply is saved to the `ChatMessage` table, linked to a `Conversation` owned by the user.
- **MemoryItems**: when real AI mode is enabled, every 6 messages in a conversation, the assistant automatically distils useful long-term facts into a `MemoryItem` summary for that user.
- **Relevance retrieval**: when a user sends a new message, the system scores all their `MemoryItem`s using keyword overlap + importance score + recency, and injects the top 5 into the system prompt as context.
- **Privacy rules (enforced in code)**:
  - Only durable, useful facts are stored (not small-talk or one-off questions).
  - Passwords, API keys, tokens, and sensitive credentials are never stored — a regex redaction step runs before any summary is persisted.
  - All queries are scoped by `userId` — memory never leaks between users.
- **Clearing**: users can delete individual conversations or click "Clear all history & memory" in the assistant UI to wipe everything.

### 4. How to test the chatbot

1. Start the development server: `npm run dev`
2. Sign in and navigate to `/assistant`.
3. Send a message. Without an OpenAI API key, you should receive the demo-mode response.
4. Confirm the message is saved in `ChatMessage`.
5. Later, add the OpenAI API key, set demo mode to false, redeploy/restart, and test a real football analytics question.

**Verify rows in the database** (using `psql` or Prisma Studio `npx prisma studio`):

```sql
SELECT * FROM "Conversation" ORDER BY "createdAt" DESC LIMIT 10;
SELECT * FROM "ChatMessage" ORDER BY "createdAt" DESC LIMIT 20;
SELECT * FROM "MemoryItem" ORDER BY "createdAt" DESC LIMIT 10;
```
