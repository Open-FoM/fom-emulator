@echo off
setlocal
cd /d "%~dp0"

call "%~dp0start_server.bat" -mode world -port 62000
