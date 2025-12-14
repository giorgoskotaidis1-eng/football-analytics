@echo off
echo Clearing .next cache...
if exist .next (
    rmdir /s /q .next
    echo .next cache cleared successfully!
) else (
    echo .next directory does not exist.
)
echo.
echo You can now restart the dev server with: npm run dev
pause

