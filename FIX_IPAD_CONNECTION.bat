@echo off
echo ========================================
echo Fixing iPad Connection Issues
echo ========================================
echo.
echo This will:
echo 1. Check if server is running
echo 2. Open Windows Firewall for port 3000
echo 3. Start the server
echo.
pause

echo.
echo Step 1: Opening Firewall for port 3000...
netsh advfirewall firewall add rule name="Node.js Server Port 3000" dir=in action=allow protocol=TCP localport=3000

echo.
echo Step 2: Starting server...
echo.
echo ========================================
echo Server starting...
echo Access from iPad: http://192.168.2.7:3000
echo ========================================
echo.

cd /d "%~dp0"
npm run dev

pause

