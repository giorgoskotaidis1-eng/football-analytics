@echo off
chcp 65001 >nul
echo ========================================
echo PostgreSQL Setup Helper
echo ========================================
echo.

echo Αυτό το script θα σε βοηθήσει να αλλάξεις από SQLite σε PostgreSQL
echo.

echo Επιλέξτε επιλογή:
echo.
echo 1. Local PostgreSQL (για development στον υπολογιστή)
echo 2. Cloud PostgreSQL (Vercel/Supabase/Neon - για production)
echo 3. Άκυρο - Exit
echo.

set /p choice="Εισάγετε επιλογή (1-3): "

if "%choice%"=="1" goto local
if "%choice%"=="2" goto cloud
if "%choice%"=="3" goto end
goto invalid

:local
echo.
echo ========================================
echo Local PostgreSQL Setup
echo ========================================
echo.
echo Βεβαιώσου ότι έχεις:
echo - Εγκατεστημένο PostgreSQL στον υπολογιστή
echo - Δημιουργημένο database (π.χ. football_analytics)
echo.
set /p dbname="Όνομα database: "
set /p dbuser="Username (default: postgres): "
if "%dbuser%"=="" set dbuser=postgres
set /p dbpass="Password: "
set /p dbhost="Host (default: localhost): "
if "%dbhost%"=="" set dbhost=localhost
set /p dbport="Port (default: 5432): "
if "%dbport%"=="" set dbport=5432

set DATABASE_URL=postgresql://%dbuser%:%dbpass%@%dbhost%:%dbport%/%dbname%

echo.
echo Θα αλλάξω το schema.prisma σε PostgreSQL...
echo.

REM Backup το schema
copy prisma\schema.prisma prisma\schema.prisma.sqlite.backup >nul

REM Άλλαξε το provider
powershell -Command "(Get-Content prisma\schema.prisma) -replace 'provider = \"sqlite\"', 'provider = \"postgresql\"' | Set-Content prisma\schema.prisma"

echo ✅ Schema άλλαξε σε PostgreSQL
echo.

echo Θα ενημερώσω το .env file...
echo.

REM Update .env
if exist .env (
    powershell -Command "(Get-Content .env) -replace 'DATABASE_URL=.*', 'DATABASE_URL=\"%DATABASE_URL%\"' | Set-Content .env"
) else (
    echo DATABASE_URL="%DATABASE_URL%" > .env
    echo JWT_SECRET="your-secret-key-change-this-in-production" >> .env
)

echo ✅ .env file ενημερώθηκε
echo.
echo ========================================
echo Επόμενα βήματα:
echo ========================================
echo.
echo 1. Generate Prisma Client:
echo    npx prisma generate
echo.
echo 2. Run migrations:
echo    npx prisma migrate dev
echo.
echo 3. (Optional) Transfer data from SQLite:
echo    - Άνοιξε Prisma Studio: npx prisma studio
echo    - Export από SQLite και import στο PostgreSQL
echo.
goto end

:cloud
echo.
echo ========================================
echo Cloud PostgreSQL Setup
echo ========================================
echo.
echo Επιλέξτε cloud provider:
echo.
echo 1. Vercel Postgres
echo 2. Supabase
echo 3. Neon
echo 4. Άλλο (custom connection string)
echo.

set /p cloudchoice="Εισάγετε επιλογή (1-4): "

if "%cloudchoice%"=="1" goto vercel
if "%cloudchoice%"=="2" goto supabase
if "%cloudchoice%"=="3" goto neon
if "%cloudchoice%"=="4" goto custom
goto invalid

:vercel
echo.
echo ========================================
echo Vercel Postgres Setup
echo ========================================
echo.
echo 1. Πήγαινε στο Vercel project
echo 2. Storage tab → Create Database → Postgres
echo 3. Αντιγράψε το DATABASE_URL
echo.
set /p DATABASE_URL="Επικολλήστε το DATABASE_URL: "
goto update_schema

:supabase
echo.
echo ========================================
echo Supabase Setup
echo ========================================
echo.
echo 1. Πήγαινε στο https://supabase.com
echo 2. Δημιούργησε project
echo 3. Settings → Database → Connection String (URI)
echo.
set /p DATABASE_URL="Επικολλήστε το DATABASE_URL: "
goto update_schema

:neon
echo.
echo ========================================
echo Neon Setup
echo ========================================
echo.
echo 1. Πήγαινε στο https://neon.tech
echo 2. Δημιούργησε project
echo 3. Αντιγράψε το Connection String
echo.
set /p DATABASE_URL="Επικολλήστε το DATABASE_URL: "
goto update_schema

:custom
echo.
set /p DATABASE_URL="Επικολλήστε το PostgreSQL connection string: "
goto update_schema

:update_schema
echo.
echo Θα αλλάξω το schema.prisma σε PostgreSQL...
echo.

REM Backup το schema
copy prisma\schema.prisma prisma\schema.prisma.sqlite.backup >nul

REM Άλλαξε το provider
powershell -Command "(Get-Content prisma\schema.prisma) -replace 'provider = \"sqlite\"', 'provider = \"postgresql\"' | Set-Content prisma\schema.prisma"

echo ✅ Schema άλλαξε σε PostgreSQL
echo.

echo Θα ενημερώσω το .env file...
echo.

REM Update .env
if exist .env (
    powershell -Command "(Get-Content .env) -replace 'DATABASE_URL=.*', 'DATABASE_URL=\"%DATABASE_URL%\"' | Set-Content .env"
) else (
    echo DATABASE_URL="%DATABASE_URL%" > .env
    echo JWT_SECRET="your-secret-key-change-this-in-production" >> .env
)

echo ✅ .env file ενημερώθηκε
echo.
echo ========================================
echo Επόμενα βήματα:
echo ========================================
echo.
echo 1. Generate Prisma Client:
echo    npx prisma generate
echo.
echo 2. Run migrations:
echo    npx prisma migrate deploy
echo    (ή npx prisma migrate dev για development)
echo.
goto end

:invalid
echo.
echo ⚠️  Άκυρη επιλογή!
echo.
goto end

:end
echo.
echo ========================================
echo Ολοκληρώθηκε!
echo ========================================
echo.
echo Τοπική ιστοσελίδα (σταθερό):
echo http://localhost:3000
echo.
echo Σημείωση:
echo Τα links *.trycloudflare.com είναι προσωρινά και μπορεί να λήξουν (άσπρη σελίδα).
echo Για public πρόσβαση, ξεκίνα νέο tunnel και χρησιμοποίησε το νέο URL.
echo.
echo Για περισσότερες πληροφορίες, δες το POSTGRESQL_SETUP.md
echo.
pause
