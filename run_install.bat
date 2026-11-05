@echo off
set "PATH=%PATH%;C:\Program Files\nodejs"
echo NODE VERSION:
node -v
echo NPM VERSION:
npm -v
echo.
echo STARTING NPM INSTALL...
call npm install 2>&1
echo.
echo EXIT CODE: %errorlevel%
echo INSTALL COMPLETE
