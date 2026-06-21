# 🎮 Melody Mess - Game Modes Roadmap

เอกสารรวบรวมไอเดียและกลไกการทำงานของโหมดเกมปาร์ตี้ Real-time สำหรับ Melody Mess ที่เพิ่มความปั่นและความสนุกในห้องเล่นเกมกับเพื่อนๆ

---

## 📋 Table of Contents

1. [โฮ่งฮับแชมเปียนชิป (Barking Battle)](#1-โฮ่งฮับแชมเปียนชิป)
2. [คาราโอเกะสายพาน (Broken Karaoke - Chain Melody)](#2-คาราโอเกะสายพาน)
3. [คาราโอเกะโทรศัพท์เสีย (Broken Karaoke - Classic)](#3-คาราโอเกะโทรศัพท์เสีย)
4. [ทายใจเสียงฮัม (Draw The Melody)](#4-ทายใจเสียงฮัม)

---

## 🐶 1. โฮ่งฮับแชมเปียนชิป (Barking Battle)

โหมดแข่งขัน Real-time ดวลฝีปากความไวและพลังเสียงภายในเวลาที่กำหนด

### 🕹️ กลไกการเล่น (Gameplay Mechanics)

* **กติกา:** ผู้เล่นทุกคนจะต้องกดปุ่ม "เห่า" รัวๆ แข่งกันภายในเวลา **30 วินาที**
* **วิธีการชนะ:** ใครที่สามารถทำคะแนนการเห่าได้สูงที่สุด (หรือกดส่งเสียงได้ดัง/รัวที่สุด) เมื่อหมดเวลาจะเป็นผู้ชนะ
* **ลูกเล่นเพิ่มเติม:** มีแถบเกจพลัง (Volume/Bark Meter) เด้งขึ้นมาบนจอของทุกคนแบบ Real-time เพื่อให้เห็นว่าตอนนี้ใครกำลังนำอยู่

### 💻 การทำงานของ Socket.io (Technical Flow)

1. **START_BARKING_BATTLE** - Server ส่งอีเวนต์เริ่มต้นพร้อมเลื่อนถอยหลัง 30 วินาที
   - ข้อมูลที่ส่ง: `roomCode`, `duration: 30`, `players`

2. **SUBMIT_BARK** - ทุกครั้งที่ผู้เล่นกดปุ่มเห่า Client จะส่ง event นี้ไปที่ Server
   - ข้อมูลที่ส่ง: `roomCode`, `playerId`

3. **BARK_SCORE_UPDATE** - Server จะนับคะแนนแล้วกระจายข้อมูลกลับไปให้ทุกคน
   - ข้อมูลที่ส่ง: `scores: { playerId: barkCount }`

4. **END_BARKING_BATTLE** - เมื่อครบ 30 วินาที Server ส่ง event นี้พร้อมสรุปอันดับผู้ชนะ
   - ข้อมูลที่ส่ง: `results: [{ playerId, playerName, score, rank }]`

### 🎮 Frontend Implementation

```javascript
// Client-side socket events
socket.emit('START_BARKING_BATTLE', { roomCode, playerId });
socket.on('BARKING_BATTLE_STARTED', (data) => {
  // Initialize timer and UI
  startCountdown(data.duration);
});

socket.on('BARK_SCORE_UPDATE', (data) => {
  // Update live scores on UI
  updateScores(data.scores);
});

socket.emit('SUBMIT_BARK', { roomCode, playerId });

socket.on('BARKING_BATTLE_RESULTS', (data) => {
  // Show final results
  displayResults(data.results);
});
```

### 📊 Backend Implementation (gameServer.js)

```javascript
socket.on('START_BARKING_BATTLE', ({ roomCode, playerId }, ack) => {
  // Initialize battle mode
  roomManager.initBarkingBattle(roomCode);
  io.to(roomCode).emit('BARKING_BATTLE_STARTED', { duration: 30 });
});

socket.on('SUBMIT_BARK', ({ roomCode, playerId }) => {
  // Add score for this player
  roomManager.addBarkScore(roomCode, playerId, 1);
  io.to(roomCode).emit('BARK_SCORE_UPDATE', { scores });
});

socket.on('END_BARKING_BATTLE', ({ roomCode }, ack) => {
  // Finalize and calculate results
  const results = roomManager.finalizeBarkingBattle(roomCode);
  io.to(roomCode).emit('BARKING_BATTLE_RESULTS', { results });
});
```

---

## 🎤 2. คาราโอเกะสายพาน (Broken Karaoke - Chain Melody)

โหมดส่งต่อท่อนเพลงปริศนาที่จะค่อยๆ เพี้ยนขึ้นเรื่อยๆ จนกลายเป็นเพลงใหม่ตอนท้าย

### 🕹️ กลไกการเล่น (Gameplay Mechanics)

1. **The Chosen One (ผู้รับสาส์น):** ระบบจะสุ่มผู้เล่นมา 1 คน เพื่อให้เป็นคนเห็น **"เนื้อร้องต้นฉบับ"** พร้อมทำนองสั้นๆ

2. **The Whisper (การร้องส่งต่อ):**
   * ผู้เล่นคนนั้นต้องเปิดไมค์ร้องเพลงนี้ภายในเวลา **10 วินาที** เพื่ออัดเสียงลงระบบ
   * เสียงอัดจะถูกส่งไปให้ "คนถัดไป" ฟัง โดยคนถัดไปจะ**ไม่เห็นเนื้อร้อง** เห็นแค่ปุ่มกดฟังเสียง
   * คนถัดไปฟังแล้วต้องร้องตามที่ตัวเองได้ยิน (จำมา) ภายใน 10 วินาทีเพื่ออัดส่งต่อ
   * ทำแบบนี้วนไปจนครบทุกคนในห้อง

3. **The Grand Finale (ยำรวมมิตร):** เมื่อครบทุกคน ระบบจะดึงเอาไฟล์เสียงอัดของทุกคนมาต่อกันเป็นเพลงยาว แล้วเปิดคลอไปกับ **BGM (Backing Track)** ต้นฉบับตอนเฉลยให้ทุกคนฟังพร้อมกัน

### 💻 การทำงานของ Socket.io (Technical Flow)

* **START_CHAIN_KARAOKE** - Server สุ่มลำดับผู้เล่น (Queue) และส่งเนื้อร้องให้คนแรก
  - ข้อมูลที่ส่ง: `roomCode`, `challenge` (song lyrics/name), `currentPlayer`

* **SUBMIT_CHAIN_AUDIO** - Client ส่งไฟล์เสียง (Blob/Base64) กลับมาที่ Server
  - ข้อมูลที่ส่ง: `roomCode`, `audioData`, `playerId`

* **CHAIN_KARAOKE_NEXT_TURN** - Server ส่งไฟล์เสียงของคนก่อนหน้าไปให้คนถัดไปในคิว
  - ข้อมูลที่ส่ง: `nextPlayer`, `previousAudio`, `currentTurnIndex`, `totalPlayers`

* **CHAIN_KARAOKE_COMPLETE** - หลังจากครบทุกคน Server ส่ง event นี้
  - ข้อมูลที่ส่ง: `audioQueue: [{ playerId, audio }]`, `originalChallenge`

* **PLAY_FINAL_MIX** - ระบบเล่นคิวเสียงทั้งหมดตั้งแต่คนแรกถึงคนสุดท้าย

### 🎮 Frontend Implementation

```javascript
// Start game
socket.emit('START_CHAIN_KARAOKE', { 
  roomCode, 
  challenge: "เพลงที่โฮสต์เลือก",
  playerId 
});

socket.on('CHAIN_KARAOKE_STARTED', (data) => {
  // Current player sees lyrics and song
  if (amCurrentPlayer) {
    displayLyrics(data.challenge);
    startRecording(10); // 10 seconds
  }
});

socket.on('CHAIN_KARAOKE_NEXT_TURN', (data) => {
  // Next player only hears audio
  playAudio(data.previousAudio);
  startRecording(10);
});

socket.emit('SUBMIT_CHAIN_AUDIO', { 
  roomCode, 
  audioData: recordedBlob,
  playerId 
});

socket.on('CHAIN_KARAOKE_COMPLETE', (data) => {
  // Play final compilation
  playFinalMix(data.audioQueue, data.originalChallenge);
});
```

---

## 📞 3. คาราโอเกะโทรศัพท์เสีย (Broken Karaoke - Classic)

โหมดเลียนแบบจากเสียงสู่เสียงเพื่อวัดความเพี้ยนในตอนท้าย

### 🕹️ กลไกการเล่น (Gameplay Mechanics)

* **คนแรก:** ฟังเพลงจริงจากอนิเมะหรือเพลงฮิตเป็นเวลา 5 วินาที แล้วอัดเสียงเลียนแบบส่งต่อ

* **คนต่อไป:** ฟังเสียงจาก "คนก่อนหน้าตัวเองเท่านั้น" (ไม่ได้ฟังเพลงจริง) แล้วอัดเสียงเลียนแบบส่งต่อกันไปเป็นทอดๆ (รองรับสูงสุด 10 คน)

* **ตอนจบ:** เปิดไฟล์เสียงไล่ตั้งแต่ เพลงจริง -> คนที่ 1 -> คนที่ 2 -> ... -> คนสุดท้าย เพื่อดูความหลุดโลกของเสียงที่เปลี่ยนไป

### 💻 การทำงานของ Socket.io (Technical Flow)

* **START_CLASSIC_KARAOKE** - Server สุ่มลำดับผู้เล่นและเตรียมข้อมูล
  - ข้อมูลที่ส่ง: `roomCode`, `challenge`, `currentPlayer`

* **SUBMIT_WHISPER_AUDIO** - Client ส่งไฟล์เสียง Whisper Chain
  - ข้อมูลที่ส่ง: `roomCode`, `audioData`, `playerId`

* **CLASSIC_KARAOKE_NEXT_TURN** - Server ส่งไฟล์เสียงของคนก่อนหน้าให้คนถัดไป
  - ข้อมูลที่ส่ง: `nextPlayer`, `previousAudio`, `currentTurnIndex`

* **CLASSIC_KARAOKE_COMPLETE** - เมื่อครบทุกคน
  - ข้อมูลที่ส่ง: `audioQueue`, `originalChallenge`

### 🎮 Frontend Implementation

```javascript
socket.emit('START_CLASSIC_KARAOKE', {
  roomCode,
  challenge: "เพลงจริง/ชื่อเพลง",
  playerId
});

socket.on('CLASSIC_KARAOKE_STARTED', (data) => {
  if (isFirstPlayer) {
    playOriginalSong(data.challenge, 5); // 5 seconds
  }
});

socket.on('CLASSIC_KARAOKE_NEXT_TURN', (data) => {
  // Play only the previous player's audio
  playAudio(data.previousAudio);
  startRecording(10);
});

socket.emit('SUBMIT_WHISPER_AUDIO', {
  roomCode,
  audioData,
  playerId
});

socket.on('CLASSIC_KARAOKE_COMPLETE', (data) => {
  // Show the transformation chain
  displayComparisonChain(data.audioQueue, data.originalChallenge);
});
```

---

## 🎨 4. ทายใจเสียงฮัม (Draw The Melody)

เปลี่ยนจากคำใบ้ตัวอักษรเป็นเสียงเพลง แล้วถ่ายทอดออกมาเป็นรูปภาพ

### 🕹️ กลไกการเล่น (Gameplay Mechanics)

* **คนฮัมเพลง:** ได้โจทย์ชื่อเพลงมา จากนั้นต้องเปิดไมค์เพื่อ "ฮัมเพลง" (ห้ามหลุดพูดชื่อเพลงเด็ดขาด) เป็นเวลา 15 วินาที

* **คนวาดรูป:** ผู้เล่นคนอื่นๆ ทั้งหมดในห้องจะไม่ได้ยินชื่อเพลง แต่จะได้ยินเสียงฮัม จากนั้นต้อง **"วาดรูป"** บน Canvas ในสิ่งที่ตัวเองนึกออกหรือจินตนาการได้จากเสียงฮัมนั้นๆ (ระยะเวลา 30 วินาทีต่อคน)

* **ตอนจบ:** ทุกคนส่งรูปภาพ และระบบจะแสดงรูปภาพของทุกคนบนหน้าจอพร้อมเฉลยชื่อเพลงจริง ใครที่วาดรูปได้สื่อถึงเพลงมากที่สุด (เพื่อนๆ โหวต) หรือทายถูกในใจจะได้คะแนน

### 💻 การทำงานของ Socket.io (Technical Flow)

* **START_DRAW_MELODY** - Server เลือกผู้เล่นฮัมแบบสุ่ม
  - ข้อมูลที่ส่ง: `roomCode`, `challenge` (song name), `hummingPlayer`, `timeToHum: 15`, `timeToDrawPerPlayer: 30`

* **DRAW_MELODY_ROLE_ASSIGNED** - Server ส่งบอกบทบาทของแต่ละคน
  - ข้อมูลที่ส่ง: `yourRole` ('hummer' or 'drawer'), `hummingPlayerId`

* **SUBMIT_HUMMING** - Client ส่งไฟล์เสียงฮัม
  - ข้อมูลที่ส่ง: `roomCode`, `audioData`, `playerId`

* **HUMMING_COMPLETE** - หลังจากคนฮัมเสร็จ ระบบเตรียมให้คนวาดรูป
  - ข้อมูลที่ส่ง: `hummingPlayer`, `readyForDrawing: true`, `drawingTimeLimit: 30`

* **SUBMIT_DRAWING** - Client ส่งรูปที่วาด
  - ข้อมูลที่ส่ง: `roomCode`, `drawingData` (canvas image), `playerId`

* **DRAWING_SUBMITTED** - ประกาศว่าผู้เล่นคนนี้ส่งรูปแล้ว
  - ข้อมูลที่ส่ง: `playerId`, `playerName`

* **ALL_DRAWINGS_COMPLETE** - เมื่อทุกคนส่งรูป
  - ข้อมูลที่ส่ง: `drawings`, `challenge` (song name), `hummingAudio`

* **VOTE_DRAWING** - ผู้เล่นโหวตรูปที่ชอบที่สุด
  - ข้อมูลที่ส่ง: `roomCode`, `votedForPlayerId`, `playerId`

### 🎮 Frontend Implementation

```javascript
socket.emit('START_DRAW_MELODY', {
  roomCode,
  challenge: "เพลง/ชื่อเพลง",
  playerId
});

socket.on('DRAW_MELODY_STARTED', (data) => {
  // Show humming player and setup
  showHummingPlayer(data.hummingPlayer);
});

socket.on('DRAW_MELODY_ROLE_ASSIGNED', (data) => {
  if (data.yourRole === 'hummer') {
    showChallenge(data.challenge);
    startHumming(15); // 15 seconds
  } else {
    showWaitingScreen();
  }
});

socket.on('HUMMING_COMPLETE', (data) => {
  // Prepare canvas for drawing
  showCanvas();
  startDrawingTimer(data.drawingTimeLimit);
});

socket.emit('SUBMIT_HUMMING', {
  roomCode,
  audioData: hummingBlob,
  playerId
});

socket.emit('SUBMIT_DRAWING', {
  roomCode,
  drawingData: canvasImage,
  playerId
});

socket.on('ALL_DRAWINGS_COMPLETE', (data) => {
  // Show all drawings and humming audio
  displayGallery(data.drawings);
  playHummingAudio(data.hummingAudio);
  showChallenge(data.challenge);
});

socket.emit('VOTE_DRAWING', {
  roomCode,
  votedForPlayerId,
  playerId
});
```

---

## 🚀 Development Status

| โหมด | สถานะ | Notes |
|------|-------|-------|
| Barking Battle | ✅ Backend Ready | Socket handlers implemented |
| Chain Melody | ✅ Backend Ready | Full flow with queue system |
| Classic Karaoke | ✅ Backend Ready | Whisper chain mechanics |
| Draw The Melody | ✅ Backend Ready | Humming + drawing flow |

---

## 📱 Frontend Components Needed

### For All Modes:
- [ ] Game mode selection screen
- [ ] Real-time score display component
- [ ] Audio recording utility
- [ ] Canvas drawing component (for Draw The Melody)
- [ ] Results/Leaderboard display

### Mode-Specific:
- [ ] **Barking Battle**: Bark button, live meter
- [ ] **Chain Karaoke**: Lyrics display, audio player, recording timer
- [ ] **Classic Karaoke**: Hidden lyrics, audio playback, recording interface
- [ ] **Draw The Melody**: Canvas, drawing tools, humming audio playback

---

## 🔧 Backend Services Integration

### Room Manager Methods
```javascript
// Barking Battle
roomManager.initBarkingBattle(roomCode)
roomManager.addBarkScore(roomCode, playerId, points)
roomManager.finalizeBarkingBattle(roomCode)

// Broken Karaoke Chain
roomManager.initBrokenKaraokeChain(roomCode)
roomManager.getCurrentTurnPlayer(roomCode)
roomManager.submitChainAudio(roomCode, audioData)

// Broken Karaoke Classic
roomManager.initBrokenKaraokeClassic(roomCode)
roomManager.submitWhisperChainAudio(roomCode, audioData)

// Draw The Melody
roomManager.initDrawTheMelody(roomCode)
roomManager.setHummingPlayer(roomCode, playerId)
roomManager.submitHummingAudio(roomCode, audioData)
roomManager.submitDrawing(roomCode, playerId, drawingData)
```

---

## 🌐 Socket Event Summary

### Room Management
- `CREATE_ROOM`, `JOIN_ROOM`

### Barking Battle
- `START_BARKING_BATTLE`, `SUBMIT_BARK`, `END_BARKING_BATTLE`
- `BARKING_BATTLE_STARTED`, `BARK_SCORE_UPDATE`, `BARKING_BATTLE_RESULTS`

### Chain Melody
- `START_CHAIN_KARAOKE`, `SUBMIT_CHAIN_AUDIO`
- `CHAIN_KARAOKE_STARTED`, `CHAIN_KARAOKE_NEXT_TURN`, `CHAIN_KARAOKE_COMPLETE`

### Classic Karaoke
- `START_CLASSIC_KARAOKE`, `SUBMIT_WHISPER_AUDIO`
- `CLASSIC_KARAOKE_STARTED`, `CLASSIC_KARAOKE_NEXT_TURN`, `CLASSIC_KARAOKE_COMPLETE`

### Draw The Melody
- `START_DRAW_MELODY`, `SUBMIT_HUMMING`, `SUBMIT_DRAWING`, `VOTE_DRAWING`
- `DRAW_MELODY_STARTED`, `DRAW_MELODY_ROLE_ASSIGNED`, `HUMMING_COMPLETE`, `ALL_DRAWINGS_COMPLETE`

---

## ✅ Next Steps

1. ✅ Implement backend socket handlers (DONE)
2. ⏳ Build frontend components for each game mode
3. ⏳ Add audio processing utilities for recording and playback
4. ⏳ Implement drawing canvas component
5. ⏳ Add leaderboard and scoring system
6. ⏳ Test full game flows with multiple players
7. ⏳ Deploy to production

---

**Last Updated:** 2026-06-21  
**Game Modes:** 4 (Plus existing Battle Singer mode)  
**Total Players Supported:** 8 per room  
**Real-time Protocol:** Socket.io 4.7.2
