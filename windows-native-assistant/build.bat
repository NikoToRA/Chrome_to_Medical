@echo off
REM Karte AI+ Assistant Build Script

echo ============================================
echo Karte AI+ Assistant - Build Script
echo ============================================
echo.

cd /d %~dp0\src

REM Restore packages
echo.
echo [1/3] Restoring NuGet packages...
dotnet restore

if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to restore packages
    pause
    exit /b 1
)

REM Build project
echo.
echo [2/3] Building project...
dotnet build -c Release

if %ERRORLEVEL% neq 0 (
    echo ERROR: Build failed
    pause
    exit /b 1
)

REM Publish
echo.
echo [3/3] Publishing single EXE...
dotnet publish -c Release -o ..\publish

if %ERRORLEVEL% neq 0 (
    echo ERROR: Publish failed
    pause
    exit /b 1
)

echo.
echo ============================================
echo Build completed successfully!
echo.
echo Output: publish\KarteAI-Assistant.exe
echo ============================================
echo.

dir ..\publish\*.exe

pause
