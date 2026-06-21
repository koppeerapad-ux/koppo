# Fix Socket.IO Connection on Production

## Problem
`https://koppo.onrender.com` is running on ports 10000 + HTTP:3001 (likely API/frontend server), NOT the Socket.IO server which should run `npm run start:socket` on port 3003.

---

## Solution A: Update Existing `koppo` Service on Render (Quickest)

1. Go to https://dashboard.render.com → Select `koppo` service
2. Go to **Settings** → **Environment** → Add or Update:
   - `FRONTEND_URL` = `https://testweb67-9c814.web.app`
   - `SOCKET_PORT` = `3003` (optional, has default)
   - `NODE_ENV` = `production`
3. Go to **Settings** → **General** → Find "Start Command"
   - Change from (current) to: `npm run start:socket`
4. Click **Save** → Render will rebuild and restart service

**Test after restart:**
```bash
curl -I https://koppo.onrender.com/socket.io/?EIO=4&transport=polling&t=1
# Should NOT return "Invalid Host header" anymore
```

---

## Solution B: Deploy a Separate Socket.IO Service (Recommended for Multi-Service)

If you want to keep the existing `koppo` service as API and deploy a new Socket server:

1. Push `render.yaml` from this repo to GitHub:
   ```bash
   git add render.yaml
   git commit -m "Add render.yaml for socket server"
   git push
   ```

2. Go to https://dashboard.render.com → Click **New +** → **Web Service**
   - Connect your repo
   - Select this repo
   - Name: `melody-mess-socket` (or any unique name)
   - Build: `npm install`
   - Start: `npm run start:socket`
   - Plan: Free (or Starter)
   - Click **Create Web Service**

3. Render will detect `render.yaml` and auto-configure env vars & ports
4. Once deployed (green "Live" status), copy the URL (e.g., `https://melody-mess-socket-xxxxx.onrender.com`)

5. Update frontend:
   - **Option A (Firebase):** Set env `REACT_APP_SOCKET_URL=https://melody-mess-socket-xxxxx.onrender.com` → rebuild → redeploy
   - **Option B (Vercel):** Add env var in Vercel dashboard and trigger redeploy

---

## Solution C: Local Test First (Optional)

Before deploying, verify socket server works locally:

```bash
# Terminal 1: Start socket server
npm run start:socket

# Terminal 2: Run test client
node tools/testSocket.js http://localhost:3003
# Should output: "connected, id=..."
```

If works locally, pick Solution A or B above.

---

## Files I've Prepared
- `render.yaml` — Render deployment config for new socket service
- `server/melodyMess/gameServer.js` — Updated CORS to use `FRONTEND_URL` env
- `tools/testSocket.js` — Test script to verify connection

---

## Next Steps
Pick **Solution A** (fastest) or **Solution B** (cleaner), then:
1. Make the change
2. Wait 2–5 min for Render to restart
3. Run the test curl command above
4. If 200 OK + no "Invalid Host header", then frontend will auto-reconnect within 5 sec
5. Check production site: `https://testweb67-9c814.web.app` → Melody Mess → try to join/create room
