@echo off
chcp 65001 >nul
echo ========================================
echo Fixing Prisma Client
echo ========================================
echo.

echo [1/2] Generating Prisma Client...
call npx prisma generate

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Prisma generate failed!
    pause
    exit /b 1
)

echo.
echo ✅ Prisma Client generated successfully!
echo.

echo [2/2] Verifying Prisma Client...
if exist node_modules\.prisma\client\index.js (
    echo ✅ Prisma Client files found
) else (
    echo ⚠️  Warning: Prisma Client files not found
)

echo.
echo ========================================
echo ✅ Fix Complete!
echo ========================================
echo.
echo Next steps:
echo  1. Stop your dev server (Ctrl+C)
echo  2. Restart: npm run dev
echo.

pause



chcp 65001 >nul
echo ========================================
echo Fixing Prisma Client
echo ========================================
echo.

echo [1/2] Generating Prisma Client...
call npx prisma generate

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ❌ Prisma generate failed!
    pause
    exit /b 1
)

echo.
echo ✅ Prisma Client generated successfully!
echo.

echo [2/2] Verifying Prisma Client...
if exist node_modules\.prisma\client\index.js (
    echo ✅ Prisma Client files found
) else (
    echo ⚠️  Warning: Prisma Client files not found
)

echo.
echo ========================================
echo ✅ Fix Complete!
echo ========================================
echo.
echo Next steps:
echo  1. Stop your dev server (Ctrl+C)
echo  2. Restart: npm run dev
echo.

pause







