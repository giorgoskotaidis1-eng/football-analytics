# Auth0 Hybrid Login Setup (Google + Existing Roles)

This project uses a hybrid auth model:
- Auth0 (Google) authenticates identity
- the app still creates its own `session` cookie (`src/lib/auth.ts`) for authorization
- Player vs User routing remains app-controlled

## Auth0 route base path used in this repo

To avoid collisions with existing app pages under `/auth/*`, Auth0 SDK routes are mounted under:

- Login: `/api/auth0/login`
- Callback: `/api/auth0/callback`
- Logout: `/api/auth0/logout`

After Auth0 callback, users are bridged to app auth via:
- `/api/auth/sso-complete`

## 1) Install / connect Auth0 in Vercel

1. Open <https://vercel.com/marketplace/auth0>
2. Install/connect it to the `football-analytics` Vercel project
3. Confirm env vars are added in Vercel project settings

## 2) Enable Google social login in Auth0

Auth0 Dashboard → Authentication → Social → Google → Enable connection for this application.

## 3) Configure Allowed URLs in Auth0 Application

Add these Callback URLs:

- `https://football-analytics-taupe.vercel.app/api/auth0/callback`
- `http://localhost:3000/api/auth0/callback`

Add these Logout URLs:

- `https://football-analytics-taupe.vercel.app/auth/login`
- `http://localhost:3000/auth/login`

## 4) Required environment variables

Set the following in Vercel (and `.env.local` for local dev):

- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`
- `AUTH0_CLIENT_SECRET`
- `AUTH0_SECRET`
- `APP_BASE_URL`
- `JWT_SECRET`
- `DATABASE_URL`

> Auth0 SDK version is pinned to `@auth0/nextjs-auth0@4.13.0` for compatibility with this repo's Next.js/React versions.

## 5) Prisma migration included

Schema updates for hybrid SSO:
- `User.auth0Id String? @unique`
- `Player.auth0Id String? @unique`
- `User.passwordHash` changed to optional (`String?`) for SSO-only accounts

Migration file:
- `prisma/migrations/20260616124500_auth0_hybrid_login/migration.sql`
