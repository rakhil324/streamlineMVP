@echo off
REM Quick icon generator using PowerShell
REM This creates minimal placeholder icons

echo Generating extension icons...

REM Create icons directory if it doesn't exist
if not exist "icons" mkdir icons

REM Note: This batch file creates a simple workaround
REM For proper icons, use generate-icons.py or create-icons.html

echo.
echo Since we cannot generate PNG files directly in batch, please:
echo 1. Open create-icons.html in your browser
echo 2. Right-click each generated icon and save them to the icons/ folder
echo 3. Or run: python generate-icons.py (if Python is installed)
echo.
echo For now, creating minimal placeholder files...

REM Create a simple text-based placeholder (won't work but prevents error)
echo Placeholder > icons\icon16.png
echo Placeholder > icons\icon32.png
echo Placeholder > icons\icon48.png
echo Placeholder > icons\icon128.png

echo.
echo WARNING: These are placeholder files and will not work!
echo Please use create-icons.html to generate proper icons.
echo.

pause

