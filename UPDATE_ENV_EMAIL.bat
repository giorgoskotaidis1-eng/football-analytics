@echo off
echo ========================================
echo Adding Email Configuration to .env
echo ========================================
echo.

REM Check if .env exists
if not exist .env (
    echo Creating .env file...
    (
    echo DATABASE_URL="file:./prisma/dev.db"
    echo JWT_SECRET="your-secret-key-change-this-in-production"
    echo.
    echo # Resend Email Service
    echo RESEND_API_KEY=
    echo.
    echo # Email Configuration
    echo FROM_EMAIL=onboarding@resend.dev
    echo APP_NAME=Football Analytics
    echo APP_URL=http://localhost:3000
    ) > .env
    echo .env file created!
) else (
    echo .env file exists, adding email config...
    echo. >> .env
    echo # Resend Email Service >> .env
    echo RESEND_API_KEY= >> .env
    echo. >> .env
    echo # Email Configuration >> .env
    echo FROM_EMAIL=onboarding@resend.dev >> .env
    echo APP_NAME=Football Analytics >> .env
    echo APP_URL=http://localhost:3000 >> .env
    echo Email configuration added to .env!
)

echo.
echo ========================================
echo Next Steps:
echo ========================================
echo 1. Get API key from https://resend.com
echo 2. Add RESEND_API_KEY=your_key_here to .env
echo 3. For production, verify your domain in Resend
echo 4. Update FROM_EMAIL to your verified domain
echo.
echo See EMAIL_SETUP.md for full instructions
echo ========================================
pause

