@echo off
echo Finding your local IP address...
echo.
ipconfig | findstr /i "IPv4"
echo.
echo Look for the IP address that starts with 192.168.x.x or 10.x.x.x
echo This is your local IP address.
echo.
echo Press any key to exit...
pause >nul


