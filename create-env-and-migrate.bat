@echo off
echo Creating .env file...
echo DATABASE_URL="file:./prisma/dev.db" > .env
echo JWT_SECRET="your-secret-key-change-this-in-production" >> .env
echo.
echo Running Prisma migration...
call npx prisma migrate dev --name add_message_comment_relations
echo.
echo Done!
pause

