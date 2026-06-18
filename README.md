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

---

## 🤖 AI Assistant (chatbot with memory)

An AI-powered chat assistant is built into the app at `/assistant`. It answers football analytics questions, remembers useful context per user, and keeps all data strictly partitioned per user.

### 1. Database migration

After pulling this branch, apply the new Prisma models (`Conversation`, `ChatMessage`, `MemoryItem`) to your database:

```bash
# Recommended for a clean development database:
npx prisma migrate dev --name add_chat_models

# Or, to push the schema directly without migration files (simpler for dev):
npx prisma db push

# Regenerate the Prisma client after schema changes:
npx prisma generate
```

### 2. Add the OpenAI API key

1. Copy `.env.example` to `.env` (if not already done):
   ```bash
   cp .env.example .env
   ```
2. Set your OpenAI API key in `.env`:
   ```
   OPENAI_API_KEY=sk-...
   ```
3. Optionally override the model (default: `gpt-4o-mini`):
   ```
   OPENAI_MODEL=gpt-4o-mini
   ```

Get an API key at <https://platform.openai.com/api-keys>.

### 3. How the memory system works

- **Per-conversation history**: every user message and assistant reply is saved to the `ChatMessage` table, linked to a `Conversation` owned by the user.
- **MemoryItems**: every 6 messages in a conversation, the assistant automatically distils useful long-term facts (team name, preferred metrics, recurring questions) into a `MemoryItem` summary for that user.
- **Relevance retrieval**: when a user sends a new message, the system scores all their `MemoryItem`s using keyword overlap + importance score + recency, and injects the top 5 into the system prompt as context.
- **Privacy rules (enforced in code)**:
  - Only durable, useful facts are stored (not small-talk or one-off questions).
  - Passwords, API keys, tokens, and sensitive credentials are **never** stored — a regex redaction step runs before any summary is persisted.
  - All queries are scoped by `userId` — memory **never leaks** between users.
- **Clearing**: users can delete individual conversations or click "Clear all history & memory" in the assistant UI to wipe everything.

### 4. How to test the chatbot

1. Start the development server: `npm run dev`
2. Sign in and navigate to `/assistant`.
3. Send a few messages (e.g. "What metrics matter most for pressing?", "Which players have the most goals this season?").
4. Open a new conversation and ask a follow-up — the assistant will have relevant context from earlier in the same conversation.
5. After 6 messages, check the `MemoryItem` table in your database — a summary should appear.
6. Use "Clear all history & memory" to wipe everything, then verify the tables are empty.

**Verify rows in the database** (using `psql` or Prisma Studio `npx prisma studio`):

```sql
SELECT * FROM "Conversation" ORDER BY "createdAt" DESC LIMIT 10;
SELECT * FROM "ChatMessage" ORDER BY "createdAt" DESC LIMIT 20;
SELECT * FROM "MemoryItem" ORDER BY "createdAt" DESC LIMIT 10;
```

