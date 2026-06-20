# 🎤 Melody Mess - Game Implementation Guide

## Project Structure

```
web ie ie/
├── src/
│   ├── pages/
│   │   └── MelodyMess/
│   │       ├── MelodyMessLobby.js      # Main lobby & mode selection
│   │       └── MelodyMess.css          # Lobby styling
│   ├── components/
│   │   └── MelodyMess/
│   │       ├── BattleSingerMode.js     # Mode 1 - Complete ✅
│   │       ├── BattleSinger.css
│   │       ├── SongChainMode.js        # Mode 2 - Structure (in progress)
│   │       └── SongChain.css
│   └── utils/
│       └── audioProcessing/
│           └── audioRecorder.js        # Audio recording utilities
├── server/
│   └── melodyMess/
│       ├── gameServer.js               # Socket.io server logic
│       └── roomManager.js              # Room & player management
└── package.json                        # Updated with socket.io deps
```

---

## 🎮 Mode 1: Battle Singer (✅ COMPLETE)

### Gameplay Flow
1. **Lobby** → Create/Join room
2. **Setup** → Host sets challenge (song name/melody hint)
3. **Recording** → Players record 20-second audio clips
4. **Playback** → Listen to all recordings together
5. **Voting** → Vote for the best performance
6. **Results** → Show final scores

### Key Components
- `BattleSingerMode.js` - Handles all game states
- `AudioRecorder` - Records user microphone input
- Socket.io events: `CREATE_ROOM`, `SET_CHALLENGE`, `AUDIO_FINISHED`, `VOTE`

### Technical Details
- **Audio Format**: WebM blob, converted to Base64 for transmission
- **Recording Duration**: 20 seconds
- **Max Players**: 8 per room
- **Room Code**: 6-character alphanumeric

---

## 🎵 Mode 2: Song Chain (📋 STRUCTURE READY)

### Gameplay Flow
1. **Lobby** → Create/Join room
2. **Origin** → Player 1 sets song title & records intro (15 sec)
3. **Chain** → Each player listens to last 3 sec of previous player, then records their part (15 sec)
4. **Result** → System concatenates all audio clips into one song

### Key Components
- `SongChainMode.js` - Game state management (structure ready)
- Queue management for player order
- Audio clip concatenation (backend logic needed)

### What's Ready
✅ UI Components & Styling
✅ Socket.io Event Structure
✅ Player Queue Management

### What Needs Implementation
❌ Audio concatenation logic (ffmpeg/backend)
❌ Clip isolation (play last 3 seconds only)
❌ File upload/storage for intermediate clips
❌ Download final merged audio

---

## 🛠️ Backend Setup

### Socket.io Server (`server/melodyMess/gameServer.js`)

**Installation**:
```bash
npm install socket.io socket.io-client
```

**Key Events**:
```javascript
// Create Room
socket.on('CREATE_ROOM', (userData) => {...})

// Battle Singer
socket.on('SET_CHALLENGE', ({roomCode, challengeText}) => {...})
socket.on('AUDIO_FINISHED', ({roomCode, playerId, audioData}) => {...})
socket.on('VOTE', ({roomCode, playerId, votedFor}) => {...})

// Song Chain
socket.on('START_SONG_CHAIN', ({roomCode}) => {...})
socket.on('ORIGIN_RECORDED', ({roomCode, songTitle, audioData}) => {...})
socket.on('CHAIN_RECORDED', ({roomCode, playerId, audioData}) => {...})
```

### Room Manager (`server/melodyMess/roomManager.js`)
- Manages room creation/joining
- Tracks player states
- Calculates voting results

---

## 📋 Integration Steps

### 1. Add Routes to App.js
```javascript
import MelodyMessLobby from './pages/MelodyMess/MelodyMessLobby';

// In your routing
<Route path="/melody-mess" element={<MelodyMessLobby />} />
```

### 2. Start Socket.io Server
```bash
node server/melodyMess/gameServer.js
```

### 3. Environment Variables
Add to `.env.local`:
```
REACT_APP_SOCKET_URL=http://localhost:3003
```

### 4. Install Dependencies
```bash
npm install
```

---

## 🚀 Deployment

### For Vercel
1. Socket.io server should run on separate dyno or separate host (Heroku/Railway/Vercel Serverless is not suitable for persistent websockets)
2. Update `REACT_APP_SOCKET_URL` in Vercel environment to the deployed socket host

### For Local Development
```bash
# Terminal 1: Frontend
npm start

# Terminal 2: API Server
node server/api.js

# Terminal 3: Melody Mess Server
node server/melodyMess/gameServer.js
```

---

## 📝 TODO - Complete Song Chain Mode

### Phase 1: Audio Concatenation Backend
- [ ] Install `fluent-ffmpeg`
- [ ] Create `audioConcat.js` utility
- [ ] Implement: `concatenateAudioClips(audioArray) → finalAudioBlob`
- [ ] Test with sample audio files

### Phase 2: Clip Isolation
- [ ] Extract last 3 seconds from audio blob
- [ ] Play only that clip to next player
- [ ] Implement `getLastNSeconds(audioBlob, seconds)`

### Phase 3: File Storage
- [ ] Upload intermediate clips to Firebase Storage
- [ ] Implement cleanup after game ends
- [ ] Generate signed URLs for playback

### Phase 4: UI Enhancements
- [ ] Add progress bar for each player
- [ ] Show queue visualization
- [ ] Add sound notifications

### Phase 5: Testing
- [ ] Multi-player testing (4+ players)
- [ ] Network latency handling
- [ ] Audio quality validation

---

## 🎨 UI Design Notes

Both modes follow the "Sing Party" app aesthetic:
- Gradient backgrounds (pastel pink, blue, yellow)
- Rounded buttons with shadows
- Responsive grid layouts
- Mobile-friendly design
- Emoji icons for visual appeal

---

## 🔊 Audio Recording Tips

### Browser Compatibility
- ✅ Chrome/Edge: Full support
- ✅ Firefox: Full support
- ⚠️ Safari: May require HTTPS

### Microphone Permission
- User must grant microphone access
- Only once per browser/domain
- Can be revoked in browser settings

### Quality Considerations
- WebM codec: Good compression, web-friendly
- 20 seconds @ 48kHz = ~200-300 KB
- Consider data limits for mobile users

---

## 🐛 Common Issues & Fixes

### Issue: Socket.io connection refused
**Solution**: Ensure gameServer.js is running on port 3003 and `REACT_APP_SOCKET_URL` is set correctly

### Issue: Microphone not accessible
**Solution**: Check browser permissions, use HTTPS in production

### Issue: Audio playback has lag
**Solution**: Pre-load audio before playing with `new Audio()`

### Issue: Players see different states
**Solution**: Verify socket.io rooms are synchronized with `io.to(roomCode).emit()`

---

## 📞 Support & Debugging

Enable debug logs:
```javascript
// In gameServer.js
const io = socketIO(server, {
  debug: true,  // Enable debug logging
});
```

Check browser console for:
- Socket connection status
- Audio recording errors
- Playback issues

---

## 🎉 Next Steps
1. ✅ Mode 1 (Battle Singer) is **production-ready**
2. 🔧 Mode 2 (Song Chain) needs audio concatenation
3. 📱 Mobile optimization (landscape mode, responsive)
4. 🎵 Leaderboard integration with Firebase
5. 🏆 Achievements & rewards system
