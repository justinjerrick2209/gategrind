@echo off
setlocal
title Gategrind converter
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto nonode
node -e "process.exit(Number(process.versions.node.split('.')[0])<18?1:0)"
if errorlevel 1 goto oldnode
if not exist questions.js goto nofolder
if not exist qimages\ goto nofolder

set "KEYFILE=%USERPROFILE%\.gategrind-gemini-key.txt"
if not "%GEMINI_API_KEY%"=="" goto havekey
if exist "%KEYFILE%" set /p GEMINI_API_KEY=<"%KEYFILE%"
if not "%GEMINI_API_KEY%"=="" goto havekey
echo.
echo You need a free Gemini API key. Get one at https://aistudio.google.com/apikey
echo.
set /p GEMINI_API_KEY=Paste your Gemini API key here and press Enter: 
if "%GEMINI_API_KEY%"=="" goto nokey
>"%KEYFILE%" echo %GEMINI_API_KEY%
echo Key saved for next time in %KEYFILE% (outside your website folder).

:havekey
echo.
echo Converting your questions to text. You can close this window any time and run it again to continue.
echo.

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
if "%RC%"=="0" echo Finished. Upload or open the site folder with the new questions_text.js in it.
pause
exit /b %RC%

:nonode
echo Node.js is not installed. Install the LTS version from https://nodejs.org then double-click this file again.
pause
exit /b 2

:oldnode
echo Your Node.js is too old. Install the current LTS version from https://nodejs.org then double-click this file again.
pause
exit /b 2

:nofolder
echo This file must sit in your website folder, next to index.html, questions.js and the qimages folder.
pause
exit /b 2

:nokey
echo No key entered.
pause
exit /b 2