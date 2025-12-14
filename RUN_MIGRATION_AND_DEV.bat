@echo off
echo Running migration...
call npx prisma migrate dev --name add_match_lineup_and_player_number
echo.
echo Starting development server...
call npm run dev


