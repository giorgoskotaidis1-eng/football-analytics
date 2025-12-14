@echo off
echo Creating .env file...
node create-env.js
if %ERRORLEVEL% EQU 0 (
    echo.
    echo Success! Now running migration...
    call npx prisma migrate dev --name add_message_comment_relations
) else (
    echo.
    echo Error creating .env file. Trying alternative method...
    echo DATABASE_URL="file:./prisma/dev.db" > .env
    echo JWT_SECRET="your-secret-key-change-this-in-production" >> .env
    echo .env file created manually!
    echo.
    echo Now run: npx prisma migrate dev --name add_message_comment_relations
)
pause

