@echo off
setlocal
title Gategrind - clean images and convert questions to text
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto nonode
if not exist qimages\ goto nofolder
if not exist questions.js goto nofolder

echo ==== STEP 1 of 2: cleaning the pictures (banners, headers, watermarks) ====
if not exist node_modules\sharp (
  echo Installing the image library once, needs internet...
  call npm install sharp
  if errorlevel 1 goto nosharp
)
node Clean-Images.mjs
if errorlevel 2 goto fail

echo.
echo ==== STEP 2 of 2: reading every question and solution into text ====
if exist questions_text.js if not exist .cleaned-marker (
  echo Old questions_text.js found. It belongs to the old pictures, so it is moved to questions_text.old.js
  move /y questions_text.js questions_text.old.js >nul
)
echo done> .cleaned-marker

set "KEYFILE=%USERPROFILE%\.gategrind-gemini-key.txt"
if not "%GEMINI_API_KEY%"=="" goto havekey
if exist "%KEYFILE%" set /p GEMINI_API_KEY=<"%KEYFILE%"
if not "%GEMINI_API_KEY%"=="" goto havekey
echo.
echo You need a free Gemini API key. Get one at https://aistudio.google.com/apikey
set /p GEMINI_API_KEY=Paste your Gemini API key here and press Enter: 
if "%GEMINI_API_KEY%"=="" goto nokey
>"%KEYFILE%" echo %GEMINI_API_KEY%
:havekey
:run
node Convert.mjs
set "RC=%errorlevel%"
if "%RC%"=="0" goto done
if "%RC%"=="2" goto done
echo.
choice /c YN /m "Some items are still missing. Try them again now"
if errorlevel 2 goto done
timeout /t 20 >nul
goto run
:done
echo.
if "%RC%"=="0" echo ALL DONE. Upload index.html, questions.js, questions_text.js and the qimages folder.
if not "%RC%"=="0" echo Stopped before finishing (limit or error). Progress is saved: double-click this file again later to continue.
pause
exit /b %RC%
:fail
echo Cleaning failed, see the message above.
pause
exit /b 1
:nonode
echo Node.js is not installed. Install the LTS version from https://nodejs.org then double-click this file again.
pause
exit /b 2
:nofolder
echo This file must sit in your website folder, next to index.html, questions.js and the qimages folder.
pause
exit /b 2
:nosharp
echo Could not install the image library. Check your internet connection.
pause
exit /b 2
:nokey
echo No key entered.
pause
exit /b 2