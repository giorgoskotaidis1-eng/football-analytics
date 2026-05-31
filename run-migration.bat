@echo off
chcp 65001 >nul
echo ========================================
echo Staff Management Migration
echo ========================================
echo.

echo ⚠️  WARNING: This will reset your database!
echo All existing data will be lost.
echo.
set /p confirm="Are you sure? (yes/no): "

if /i not "%confirm%"=="yes" (
    echo Migration cancelled.
    pause
    exit /b 0
)

echo.
echo [1/3] Resetting database...
call npx prisma migrate reset --force
if errorlevel 1 (
    echo ERROR: Failed to reset database
    pause
    exit /b 1
)

echo.
echo [2/3] Creating migration...
call npx prisma migrate dev --name add_user_team_relationship
if errorlevel 1 (
    echo ERROR: Failed to create migration
    pause
    exit /b 1
)

echo.
echo [3/3] Generating Prisma Client...
call npx prisma generate
if errorlevel 1 (
    echo WARNING: Failed to generate Prisma Client
    echo You may need to restart the dev server
)

echo.
echo ========================================
echo ✅ Migration completed!
echo ========================================
echo.
echo Next steps:
echo 1. Restart your dev server (if running)
echo 2. Test registration with team creation
echo 3. Go to /admin/staff to manage team members
echo.
pause
