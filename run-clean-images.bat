@echo off
setlocal
title Gategrind image cleaner
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto nonode
if not exist qimages\ goto nofolder
if not exist node_modules\sharp (
  echo Installing the image library (one time, needs internet)...
  call npm install sharp
  if errorlevel 1 goto nosharp
)
echo.
echo Cleaning pictures in qimages\ ... originals are kept in qimages_original\
echo (To try 12 samples first without changing anything, run:  set PREVIEW=12   and then  node Clean-Images.mjs)
echo.
node Clean-Images.mjs
echo.
echo NEXT: delete questions_text.js (if it exists) and double-click run-convert.bat
pause
exit /b 0
:nonode
echo Node.js is not installed. Install the LTS version from https://nodejs.org then double-click this file again.
pause
exit /b 2
:nofolder
echo This file must sit in your website folder, next to index.html and the qimages folder.
pause
exit /b 2
:nosharp
echo Could not install the image library. Check your internet connection and try again.
pause
exit /b 2