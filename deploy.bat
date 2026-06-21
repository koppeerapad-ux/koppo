@echo off
REM Melody Mess Production Deployment Script (Windows)
REM This script deploys the socket server to Render and frontend to Firebase

setlocal enabledelayedexpansion

echo.
echo 🎵 Melody Mess Production Deployment
echo ======================================
echo.

REM Step 1: Verify prerequisites
echo [Step 1] Verifying prerequisites...

where node >nul 2>nul
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16+
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm
    pause
    exit /b 1
)

where firebase >nul 2>nul
if errorlevel 1 (
    echo ❌ Firebase CLI is not installed. Run: npm install -g firebase-tools
    pause
    exit /b 1
)

echo ✓ Prerequisites verified
echo.

REM Step 2: Install dependencies
echo [Step 2] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ npm install failed
    pause
    exit /b 1
)
echo ✓ Dependencies installed
echo.

REM Step 3: Check environment variables
echo [Step 3] Checking environment configuration...

if not exist ".env.production.local" (
    echo ⚠ .env.production.local not found
    echo Creating from template. Please update with your Firebase credentials:
    copy .env.production.local.example .env.production.local
    echo 📝 PLEASE EDIT: .env.production.local
    echo (Add your Firebase API keys before proceeding)
    pause
)

echo ✓ Environment configuration ready
echo.

REM Step 4: Build frontend
echo [Step 4] Building React application...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed. Check the errors above.
    pause
    exit /b 1
)

if not exist "build" (
    echo ❌ Build directory not found. Build may have failed.
    pause
    exit /b 1
)

echo ✓ Frontend build successful
for /f %%A in ('dir /s /b build ^| find /c /v ""') do echo   Build items: %%A files
echo.

REM Step 5: Deploy frontend to Firebase
echo [Step 5] Deploying frontend to Firebase Hosting...
call firebase deploy --only hosting
if errorlevel 1 (
    echo ❌ Firebase deployment failed. Check credentials and try again.
    pause
    exit /b 1
)
echo ✓ Firebase Hosting deployment successful
echo   URL: https://testweb67-9c814.web.app
echo.

REM Step 6: Push to Git (for Render auto-deploy)
echo [Step 6] Pushing changes to Git repository...

if exist ".git" (
    git add -A
    git commit -m "deploy: release new game modes and production updates - barking battle, chain melody, draw melody"
    git push origin main
    if errorlevel 1 (
        echo ⚠ Git push failed. Manual Render deployment may be required.
    ) else (
        echo ✓ Changes pushed to repository
        echo   Render will auto-deploy in 2-5 minutes...
    )
) else (
    echo ⚠ Not a git repository. Skipping Git push.
    echo   Manual Render deployment may be required.
)
echo.

REM Step 7: Verification
echo [Step 7] Deployment Complete!
echo.
echo ✅ All systems deployed successfully!
echo.
echo 📊 Deployment Summary:
echo   • Frontend: https://testweb67-9c814.web.app
echo   • Socket Server: https://koppo.onrender.com
echo   • Firebase Console: https://console.firebase.google.com/project/testweb67-9c814
echo   • Render Dashboard: https://dashboard.render.com/services/melody-mess-socket
echo.
echo 🔍 Next steps:
echo   1. Visit https://testweb67-9c814.web.app
echo   2. Create a room and test game modes
echo   3. Monitor logs on Render dashboard
echo   4. Check Firebase console for hosting logs
echo.
echo 📚 Documentation:
echo   • Game Modes: GAME_MODES_ROADMAP.md
echo   • Deployment: DEPLOYMENT_GUIDE.md
echo.
pause
