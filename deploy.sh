#!/bin/bash
# Melody Mess Production Deployment Script
# This script deploys the socket server to Render and frontend to Firebase

set -e

echo "🎵 Melody Mess Production Deployment"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify prerequisites
echo -e "${BLUE}[Step 1]${NC} Verifying prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm"
    exit 1
fi

if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed. Run: npm install -g firebase-tools"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites verified${NC}"
echo ""

# Step 2: Install dependencies
echo -e "${BLUE}[Step 2]${NC} Installing dependencies..."
npm install
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Check environment variables
echo -e "${BLUE}[Step 3]${NC} Checking environment configuration..."

if [ ! -f .env.production.local ]; then
    echo -e "${YELLOW}⚠ .env.production.local not found${NC}"
    echo "Creating from template. Please update with your Firebase credentials:"
    cp .env.production.local.example .env.production.local
    echo -e "${YELLOW}📝 PLEASE EDIT: .env.production.local${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Environment configuration ready${NC}"
echo ""

# Step 4: Build frontend
echo -e "${BLUE}[Step 4]${NC} Building React application..."
npm run build

if [ -d "build" ]; then
    echo -e "${GREEN}✓ Frontend build successful${NC}"
    echo "  Build size: $(du -sh build | cut -f1)"
else
    echo "❌ Build directory not found. Build may have failed."
    exit 1
fi
echo ""

# Step 5: Deploy frontend to Firebase
echo -e "${BLUE}[Step 5]${NC} Deploying frontend to Firebase Hosting..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Firebase Hosting deployment successful${NC}"
    echo "  URL: https://testweb67-9c814.web.app"
else
    echo "❌ Firebase deployment failed. Check credentials and try again."
    exit 1
fi
echo ""

# Step 6: Push to Git (for Render auto-deploy)
echo -e "${BLUE}[Step 6]${NC} Pushing changes to Git repository..."

if [ -d ".git" ]; then
    git add -A
    git commit -m "deploy: release new game modes and production updates - barking battle, chain melody, draw melody"
    git push origin main
    echo -e "${GREEN}✓ Changes pushed to repository${NC}"
    echo "  Render will auto-deploy in 2-5 minutes..."
else
    echo -e "${YELLOW}⚠ Not a git repository. Skipping Git push.${NC}"
    echo "  Manual Render deployment may be required."
fi
echo ""

# Step 7: Verification
echo -e "${BLUE}[Step 7]${NC} Deployment Complete!"
echo ""
echo -e "${GREEN}✅ All systems deployed successfully!${NC}"
echo ""
echo "📊 Deployment Summary:"
echo "  • Frontend: https://testweb67-9c814.web.app"
echo "  • Socket Server: https://koppo.onrender.com"
echo "  • Firebase Console: https://console.firebase.google.com/project/testweb67-9c814"
echo "  • Render Dashboard: https://dashboard.render.com/services/melody-mess-socket"
echo ""
echo "🔍 Next steps:"
echo "  1. Visit https://testweb67-9c814.web.app"
echo "  2. Create a room and test game modes"
echo "  3. Monitor logs on Render dashboard"
echo "  4. Check Firebase console for hosting logs"
echo ""
echo "📚 Documentation:"
echo "  • Game Modes: GAME_MODES_ROADMAP.md"
echo "  • Deployment: DEPLOYMENT_GUIDE.md"
echo ""
