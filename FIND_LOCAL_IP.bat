@echo off
echo ========================================
echo Finding your LOCAL IP address...
echo ========================================
echo.
echo Looking for IP addresses on your local network...
echo.

for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set ip=%%a
    set ip=!ip:~1!
    echo Found: !ip!
)

echo.
echo ========================================
echo IMPORTANT: Use the IP that starts with:
echo - 192.168.x.x
echo - 10.x.x.x  
echo - 172.16.x.x to 172.31.x.x
echo ========================================
echo.
echo The IP 46.177.220.30 is your PUBLIC IP (not what you need)
echo.
pause


