@echo off
chcp 65001 >nul
echo ========================================
echo Creating .env file with correct format
echo ========================================
echo.

REM Delete old .env if exists
if exist .env del .env

REM Create new .env with proper format (no extra spaces, correct quotes)
(
echo DATABASE_URL=file:./prisma/dev.db
echo JWT_SECRET=your-secret-key-change-this-in-production
) > .env

echo .env file created!
echo.
echo Content:
type .env
echo.
echo ========================================
echo File location:
cd
echo %CD%\.env
echo ========================================
echo.
echo Now try: npm run migrate -- --name add_message_comment_relations
pause

