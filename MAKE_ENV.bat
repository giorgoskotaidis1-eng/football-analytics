@echo off
chcp 65001 >nul
echo Creating .env file...
(
echo DATABASE_URL="file:./prisma/dev.db"
echo JWT_SECRET="your-secret-key-change-this-in-production"
) > .env
echo.
echo .env file created!
echo.
echo Now run the migration:
echo npx prisma migrate dev --name add_message_comment_relations
pause


