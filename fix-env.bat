@echo off
echo DATABASE_URL="file:./prisma/dev.db" > .env
echo JWT_SECRET="your-secret-key-change-this-in-production" >> .env
echo.
echo .env file created!
echo.
echo Now run: npx prisma migrate dev --name add_message_comment_relations
pause

