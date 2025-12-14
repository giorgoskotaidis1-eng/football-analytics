@echo off
echo ========================================
echo Checking and fixing .env file...
echo ========================================
echo.

REM Run the Node.js script to check and fix
node check-and-fix-env.js

echo.
echo ========================================
echo Verifying .env file exists...
echo ========================================
if exist .env (
    echo .env file EXISTS at:
    cd
    echo %CD%\.env
    echo.
    echo Content of .env:
    type .env
) else (
    echo ERROR: .env file NOT FOUND!
    echo Creating it now...
    (
    echo DATABASE_URL="file:./prisma/dev.db"
    echo JWT_SECRET="your-secret-key-change-this-in-production"
    ) > .env
    echo .env file created!
)

echo.
echo ========================================
echo Now try running the migration again:
echo npm run migrate -- --name add_message_comment_relations
echo ========================================
pause

