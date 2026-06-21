# 🚀 Production Deployment Guide - Melody Mess

## Overview

This guide covers deploying:
1. **Socket Server** to Render.com (https://koppo.onrender.com)
2. **Frontend** to Firebase Hosting
3. **MCP Firebase Server** (optional, for CLI tool integration)

---

## Prerequisites

- Render.com account with existing service at `koppo.onrender.com`
- Firebase project set up (`testweb67-9c814`)
- Node.js 16+ and npm installed locally
- Git repository connected (recommended)

---

## Phase 1: Socket Server Deployment to Render

### Step 1: Prepare the Server

Ensure `server/melodyMess/gameServer.js` is configured correctly:

```bash
# Check the environment variable configuration
echo "SOCKET_HOST=0.0.0.0"
echo "SOCKET_PORT=3003"
echo "FRONTEND_URL=https://testweb67-9c814.web.app"
echo "NODE_ENV=production"
```

### Step 2: Update render.yaml

The render.yaml is already updated with:
```yaml
envVars:
  - key: RENDER_EXTERNAL_URL
    value: https://koppo.onrender.com
```

This ensures the socket server knows its own external URL.

### Step 3: Deploy to Render

**Option A: Via Git Push (Recommended)**

```bash
# Push your changes to your Git repository
git add -A
git commit -m "feat: implement new game modes - barking battle, chain karaoke, draw melody"
git push origin main

# Render will automatically deploy from the connected repository
# Monitor at: https://dashboard.render.com
```

**Option B: Via Command Line**

```bash
# Install Render CLI (if not already done)
npm install -g @render/cli

# Authenticate with Render
render login

# Deploy the service
render deploy --service melody-mess-socket
```

### Step 4: Verify Socket Server

```bash
# Test socket connection
curl -v https://koppo.onrender.com/socket.io/?EIO=4&transport=polling

# Expected response: HTTP 200 with Socket.IO handshake
```

---

## Phase 2: Frontend Configuration & Deployment

### Step 1: Update Frontend Environment Variables

Create `.env.production.local` in the project root:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=<your_firebase_key>
REACT_APP_FIREBASE_PROJECT_ID=testweb67-9c814
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=<your_sender_id>
REACT_APP_FIREBASE_APP_ID=<your_app_id>

# Socket Configuration
REACT_APP_SOCKET_URL=https://koppo.onrender.com
REACT_APP_ENVIRONMENT=production
```

**Find your Firebase config:**
```bash
# In Firebase Console > Project Settings > Your apps > Configuration
# Copy the config and map to above environment variables
```

### Step 2: Build Frontend

```bash
# Install dependencies
npm install

# Build the React app
npm run build

# Verify build output
ls -la build/
# Should see: index.html, static/ folder, etc.
```

### Step 3: Deploy to Firebase Hosting

```bash
# Ensure you're logged into Firebase
firebase login

# Deploy only the hosting (frontend)
firebase deploy --only hosting

# Expected output:
# ✔ Deploy complete!
# Project Console: https://console.firebase.google.com/project/testweb67-9c814
# Hosting URL: https://testweb67-9c814.web.app
```

### Step 4: Verify Frontend Deployment

```bash
# Check the deployment
curl -I https://testweb67-9c814.web.app

# Expected: HTTP 200

# Check socket connection from frontend
curl -X POST https://testweb67-9c814.web.app/api/health
```

---

## Phase 3: Test Production Setup

### Step 1: Test Socket Connection

Open browser DevTools and run:

```javascript
// In browser console at https://testweb67-9c814.web.app
const socket = io('https://koppo.onrender.com', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});

socket.on('connect', () => {
  console.log('✅ Connected to socket server');
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from socket server');
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

### Step 2: Test Game Mode Functionality

```javascript
// Create room
socket.emit('CREATE_ROOM', {
  playerId: 'test-player-1',
  userData: { name: 'Test Player' }
}, (response) => {
  console.log('Room created:', response);
});

// Listen for room creation
socket.on('ROOM_CREATED', (data) => {
  console.log('✅ Room successfully created:', data.roomCode);
});
```

### Step 3: Test Each Game Mode

```javascript
// Test Barking Battle
socket.emit('START_BARKING_BATTLE', {
  roomCode: 'ABCDEF',
  playerId: 'test-player-1'
}, (ack) => {
  console.log('Barking Battle started:', ack);
});

// Test Chain Karaoke
socket.emit('START_CHAIN_KARAOKE', {
  roomCode: 'ABCDEF',
  challenge: 'Test Song',
  playerId: 'test-player-1'
}, (ack) => {
  console.log('Chain Karaoke started:', ack);
});

// Test Draw The Melody
socket.emit('START_DRAW_MELODY', {
  roomCode: 'ABCDEF',
  challenge: 'Test Melody',
  playerId: 'test-player-1'
}, (ack) => {
  console.log('Draw The Melody started:', ack);
});
```

---

## Phase 4: Monitoring & Troubleshooting

### Monitor Socket Server on Render

```bash
# View logs
render logs melody-mess-socket

# Or via dashboard: https://dashboard.render.com/services/melody-mess-socket
```

### Check Socket Connection Issues

**Issue: "Connection refused" or "Network error"**

```bash
# Check if server is running
curl -v https://koppo.onrender.com/socket.io/?EIO=4&transport=polling

# Check CORS configuration in gameServer.js
# Ensure corsOrigin includes https://testweb67-9c814.web.app
```

**Issue: "Cannot POST /api/health"**

```bash
# This is expected if no API route is defined
# Focus on Socket.io connection which is the main requirement
```

**Issue: Socket connects but game events not working**

```bash
# Check browser console for errors
# Verify environment variables are loaded
console.log(process.env.REACT_APP_SOCKET_URL)

# Check server logs on Render dashboard
```

### Monitor Frontend on Firebase

```bash
# Check deployment status
firebase hosting:channel:list

# View logs
firebase functions:log

# Or via Firebase Console:
# https://console.firebase.google.com/project/testweb67-9c814/hosting
```

---

## Phase 5: Continuous Deployment Setup (Optional)

### Auto-Deploy from Git

**For Socket Server (Render):**
1. Go to https://dashboard.render.com/services/melody-mess-socket
2. Settings → GitHub Integration
3. Connect repository and select `render.yaml`
4. Enable auto-deploy on push to `main` branch

**For Frontend (Firebase):**
```bash
# Initialize Firebase GitHub integration
firebase init hosting:github

# Follow prompts to connect GitHub
# Enable auto-deploy on push to main branch
```

---

## Deployment Checklist

- [ ] Socket server environment variables configured
- [ ] Frontend .env.production.local created
- [ ] Firebase credentials available
- [ ] render.yaml updated with correct URLs
- [ ] Build passes locally: `npm run build`
- [ ] No TypeScript/ESLint errors: `npm run lint`
- [ ] Socket connection tested in browser
- [ ] Game mode events tested
- [ ] Firebase hosting deployed
- [ ] Render service deployed
- [ ] Cross-origin requests working
- [ ] Logs monitored for errors

---

## Quick Deployment Commands

```bash
# Full deployment (after code changes)
npm run build
firebase deploy --only hosting
git add -A && git commit -m "Deploy new features" && git push

# Just redeploy frontend
npm run build && firebase deploy --only hosting

# Just redeploy socket server (if connected to Git)
git push origin main
# Render auto-deploys

# Check status
firebase hosting:channel:list
render logs melody-mess-socket
```

---

## Environment Variables Reference

### Socket Server (Render)
```
SOCKET_PORT=3003
SOCKET_HOST=0.0.0.0
FRONTEND_URL=https://testweb67-9c814.web.app
NODE_ENV=production
RENDER_EXTERNAL_URL=https://koppo.onrender.com
```

### Frontend (Firebase/Build)
```
REACT_APP_SOCKET_URL=https://koppo.onrender.com
REACT_APP_FIREBASE_PROJECT_ID=testweb67-9c814
REACT_APP_ENVIRONMENT=production
```

### Optional: MCP Firebase Server
```
FIREBASE_PROJECT_ID=testweb67-9c814
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
FIREBASE_DATABASE_URL=https://testweb67-9c814.firebaseio.com
```

---

## Rollback Instructions

If something goes wrong:

### Rollback Socket Server
```bash
# Via Render Dashboard
# Services > melody-mess-socket > Deployments
# Click previous deployment, select "Deploy"

# Or via Git
git revert <commit-hash>
git push origin main
```

### Rollback Frontend
```bash
# Via Firebase Console
# Hosting > Releases
# Select previous version and click "Rollback"

# Or redeploy from previous build
git checkout <previous-tag>
npm run build && firebase deploy --only hosting
```

---

## Support & Resources

- **Render Documentation**: https://render.com/docs
- **Firebase Hosting Docs**: https://firebase.google.com/docs/hosting
- **Socket.io Documentation**: https://socket.io/docs/
- **Project Repo**: Your Git repository URL

**Last Updated:** 2026-06-21  
**Deployment Status:** Ready for production  
**Estimated Deploy Time:** 5-10 minutes total
