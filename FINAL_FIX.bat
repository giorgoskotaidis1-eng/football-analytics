@echo off
echo ========================================
echo FINAL FIX for .env and Prisma
echo ========================================
echo.

REM Step 1: Create/verify .env file
echo Step 1: Creating .env file...
(
echo DATABASE_URL="file:./prisma/dev.db"
echo JWT_SECRET="your-secret-key-change-this-in-production"
) > .env
echo ✅ .env file created/updated

echo.
echo Step 2: Verifying .env content...
type .env

echo.
echo Step 3: Checking if prisma.config.ts is the issue...
echo (The prisma.config.ts might need to be removed or modified)

echo.
echo ========================================
echo SOLUTION OPTIONS:
echo ========================================
echo.
echo Option 1: Try running migration with explicit env:
echo   set DATABASE_URL=file:./prisma/dev.db && npm run migrate -- --name add_message_comment_relations
echo.
echo Option 2: Remove prisma.config.ts (if not needed)
echo   del prisma.config.ts
echo.
echo Option 3: Use npx directly:
echo   npx prisma migrate dev --name add_message_comment_relations --schema=./prisma/schema.prisma
echo.
echo ========================================
pause

