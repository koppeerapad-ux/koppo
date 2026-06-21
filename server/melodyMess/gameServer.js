const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const RoomManager = require('./roomManager');

const app = express();
const server = http.createServer(app);
const corsOrigin = process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://testweb67-9c814.web.app' : true);
const io = socketIO(server, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

const roomManager = new RoomManager();
const socketToPlayer = new Map();

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log(`🎤 User connected: ${socket.id}`);

  // Create or join room
  socket.on('CREATE_ROOM', ({ playerId, userData } = {}) => {
    const pid = playerId || socket.id;
    const roomCode = roomManager.createRoom(pid, userData || {});
    const room = roomManager.getRoom(roomCode);
    // map socket -> player
    socketToPlayer.set(socket.id, pid);
    // attach socketId to player record
    if (room && room.players[pid]) room.players[pid].socketId = socket.id;
    socket.join(roomCode);
    socket.emit('ROOM_CREATED', {
      roomCode,
      playerId: pid,
      hostId: room.hostId,
      players: room.players,
    });
    io.to(roomCode).emit('PLAYERS_UPDATE', { players: room.players, hostId: room.hostId });
    console.log(`✨ Room created: ${roomCode} by host ${pid}`);
  });

  socket.on('JOIN_ROOM', ({ roomCode, userData, playerId } = {}) => {
    const pid = playerId || socket.id;
    const room = roomManager.joinRoom(roomCode, pid, userData || {}, socket.id);
    if (room) {
      socketToPlayer.set(socket.id, pid);
      socket.join(roomCode);
      socket.emit('ROOM_JOINED', {
        roomCode,
        playerId: pid,
        hostId: room.hostId,
        players: room.players,
      });
      io.to(roomCode).emit('PLAYERS_UPDATE', { players: room.players, hostId: room.hostId });
      console.log(`➕ Player joined room ${roomCode} (${pid})`);
    } else {
      const roomExists = roomManager.getRoom(roomCode);
      const message = roomExists ? 'ห้องเต็มหรือผู้เล่นถึงขีดจำกัด' : 'ไม่พบห้องนี้';
      socket.emit('JOIN_ERROR', { message });
    }
  });


  // Mode 1: Battle Singer
  socket.on('START_BATTLE_SINGER', ({ roomCode, playerId, mode = 'battle' } = {}, ack) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const room = roomManager.getRoom(resolvedRoomCode);
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    console.log('START_BATTLE_SINGER received', { resolvedRoomCode, pid, socketId: socket.id, roomExists: !!room, hostId: room?.hostId });
    if (!room) {
      if (typeof ack === 'function') ack({ ok: false, message: 'Room not found' });
      socket.emit('START_ERROR', { message: 'Room not found' });
      return;
    }
    if (room.hostId !== pid) {
      if (typeof ack === 'function') ack({ ok: false, message: 'Only host can start game' });
      socket.emit('START_ERROR', { message: 'Only host can start game' });
      return;
    }
    room.gameMode = 'battle';
    room.gameState = 'SETUP';
    io.to(resolvedRoomCode).emit('GAME_STARTED', { 
      roomCode: resolvedRoomCode,
      gameMode: 'battle',
      players: room.players,
      hostId: room.hostId,
    });
    io.to(resolvedRoomCode).emit('PLAYERS_UPDATE', { players: room.players, hostId: room.hostId });
    if (typeof ack === 'function') ack({ ok: true });
    console.log(`▶️ Battle Singer started for room ${resolvedRoomCode} by ${pid}`);
  });

  socket.on('SET_CHALLENGE', ({ roomCode, challengeText }) => {
    const room = roomManager.getRoom(roomCode);
    if (room) {
      room.challenge = challengeText;
      room.gameState = 'RECORDING';
      room.recordingPhase = Date.now();
      io.to(roomCode).emit('CHALLENGE_SET', { 
        challenge: challengeText,
        duration: 20 
      });
      console.log(`🎯 Challenge set: ${challengeText}`);
    }
  });

  socket.on('AUDIO_CHUNK', ({ roomCode, audioBlob, playerId, timestamp }) => {
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    const room = roomManager.getRoom(roomCode);
    if (room && room.players[pid]) {
      if (!room.audioRecordings) room.audioRecordings = {};
      if (!room.audioRecordings[playerId]) room.audioRecordings[playerId] = [];
      room.audioRecordings[pid].push(audioBlob);
    }
  });

  socket.on('AUDIO_FINISHED', ({ roomCode, playerId, audioData } = {}) => {
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    const room = roomManager.getRoom(roomCode);
    if (room && room.players[pid]) {
      room.players[pid].audioData = audioData;
      room.players[pid].recordingComplete = true;

      const allRecorded = Object.values(room.players).every(p => p.recordingComplete);
      if (allRecorded) {
        room.gameState = 'PLAYBACK';
        io.to(roomCode).emit('PLAYBACK_START', { 
          players: room.players,
          audioData: room.players 
        });
        console.log(`🎬 All recordings complete, starting playback`);
      }
    }
  });

  socket.on('VOTE', ({ roomCode, playerId, votedFor } = {}) => {
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    const room = roomManager.getRoom(roomCode);
    if (room) {
      if (!room.votes) room.votes = {};
      room.votes[pid] = votedFor;

      const allVoted = Object.keys(room.votes).length === Object.keys(room.players).length - 1;
      if (allVoted) {
        const results = roomManager.calculateVotes(room);
        room.gameState = 'RESULTS';
        io.to(roomCode).emit('RESULTS', { results });
        console.log(`🏆 Voting complete, results calculated`);
      }
    }
  });

  // Mode 2: Song Chain (placeholder)
  socket.on('START_SONG_CHAIN', ({ roomCode } = {}) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const room = roomManager.getRoom(resolvedRoomCode);
    if (room) {
      room.gameMode = 'chain';
      room.gameState = 'WAITING_ORIGIN';
      room.playerQueue = Object.keys(room.players);
      io.to(resolvedRoomCode).emit('CHAIN_STARTED', { 
        queue: room.playerQueue,
        currentPlayer: room.playerQueue[0]
      });
    }
  });

  // ==================== NEW GAME MODES ====================

  // Mode 3: Barking Battle 🐶
  socket.on('START_BARKING_BATTLE', ({ roomCode, playerId } = {}, ack) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const room = roomManager.getRoom(resolvedRoomCode);
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    
    if (!room) {
      if (typeof ack === 'function') ack({ ok: false, message: 'Room not found' });
      return;
    }
    
    if (room.hostId !== pid) {
      if (typeof ack === 'function') ack({ ok: false, message: 'Only host can start' });
      return;
    }

    roomManager.initBarkingBattle(resolvedRoomCode);
    io.to(resolvedRoomCode).emit('BARKING_BATTLE_STARTED', {
      roomCode: resolvedRoomCode,
      duration: 30,
      players: room.players,
    });
    if (typeof ack === 'function') ack({ ok: true });
    console.log(`🐕 Barking Battle started in room ${resolvedRoomCode}`);
  });

  socket.on('SUBMIT_BARK', ({ roomCode, playerId } = {}) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    
    roomManager.addBarkScore(resolvedRoomCode, pid, 1);
    const room = roomManager.getRoom(resolvedRoomCode);
    
    io.to(resolvedRoomCode).emit('BARK_SCORE_UPDATE', {
      scores: room.barkScores,
    });
  });

  socket.on('END_BARKING_BATTLE', ({ roomCode } = {}, ack) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const results = roomManager.finalizeBarkingBattle(resolvedRoomCode);
    
    if (results) {
      io.to(resolvedRoomCode).emit('BARKING_BATTLE_RESULTS', { results });
      if (typeof ack === 'function') ack({ ok: true });
      console.log(`🐕 Barking Battle finished in room ${resolvedRoomCode}`);
    }
  });

  // Mode 4: Broken Karaoke - Chain Melody
  socket.on('START_CHAIN_KARAOKE', ({ roomCode, challenge, playerId } = {}, ack) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const room = roomManager.getRoom(resolvedRoomCode);
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    
    if (!room || room.hostId !== pid) {
      if (typeof ack === 'function') ack({ ok: false, message: 'Permission denied' });
      return;
    }

    roomManager.initBrokenKaraokeChain(resolvedRoomCode);
    room.challenge = challenge;
    
    const currentPlayer = roomManager.getCurrentTurnPlayer(resolvedRoomCode);
    io.to(resolvedRoomCode).emit('CHAIN_KARAOKE_STARTED', {
      roomCode: resolvedRoomCode,
      challenge,
      currentPlayer,
      timePerTurn: 10,
    });
    
    socket.to(resolvedRoomCode).emit('CHAIN_KARAOKE_INFO', {
      players: Object.keys(room.players),
      turnOrder: room.playerQueue,
      currentTurnPlayer: currentPlayer,
    });
    
    if (typeof ack === 'function') ack({ ok: true });
    console.log(`🎤 Chain Karaoke started: "${challenge}" in room ${resolvedRoomCode}`);
  });

  socket.on('SUBMIT_CHAIN_AUDIO', ({ roomCode, audioData, playerId } = {}) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    
    const result = roomManager.submitChainAudio(resolvedRoomCode, { playerId: pid, audio: audioData });
    const room = roomManager.getRoom(resolvedRoomCode);
    
    if (result?.allSubmitted) {
      io.to(resolvedRoomCode).emit('CHAIN_KARAOKE_COMPLETE', {
        audioQueue: room.chainAudioQueue,
        originalChallenge: room.challenge,
      });
      console.log(`🎵 Chain Karaoke complete in room ${resolvedRoomCode}`);
    } else if (result?.nextPlayer) {
      io.to(resolvedRoomCode).emit('CHAIN_KARAOKE_NEXT_TURN', {
        nextPlayer: result.nextPlayer,
        currentTurnIndex: room.currentTurnIndex,
        totalPlayers: room.playerQueue.length,
      });
    }
  });

  // Mode 5: Broken Karaoke - Classic (Whisper Chain)
  socket.on('START_CLASSIC_KARAOKE', ({ roomCode, challenge, playerId } = {}, ack) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const room = roomManager.getRoom(resolvedRoomCode);
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    
    if (!room || room.hostId !== pid) {
      if (typeof ack === 'function') ack({ ok: false, message: 'Permission denied' });
      return;
    }

    roomManager.initBrokenKaraokeClassic(resolvedRoomCode);
    room.challenge = challenge;
    
    const currentPlayer = roomManager.getCurrentTurnPlayer(resolvedRoomCode);
    io.to(resolvedRoomCode).emit('CLASSIC_KARAOKE_STARTED', {
      roomCode: resolvedRoomCode,
      challenge, // Only host knows this
      currentPlayer,
      timePerTurn: 10,
      isFirstPlayer: true,
    });
    
    if (typeof ack === 'function') ack({ ok: true });
    console.log(`📞 Classic Karaoke (Whisper Chain) started in room ${resolvedRoomCode}`);
  });

  socket.on('SUBMIT_WHISPER_AUDIO', ({ roomCode, audioData, playerId } = {}) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    
    const result = roomManager.submitWhisperChainAudio(resolvedRoomCode, { playerId: pid, audio: audioData });
    const room = roomManager.getRoom(resolvedRoomCode);
    
    if (result?.allSubmitted) {
      io.to(resolvedRoomCode).emit('CLASSIC_KARAOKE_COMPLETE', {
        audioQueue: room.whisperChainAudioQueue,
        originalChallenge: room.challenge,
      });
      console.log(`📞 Classic Karaoke complete in room ${resolvedRoomCode}`);
    } else if (result?.nextPlayer) {
      io.to(resolvedRoomCode).emit('CLASSIC_KARAOKE_NEXT_TURN', {
        nextPlayer: result.nextPlayer,
        previousAudio: room.whisperChainAudioQueue[room.whisperChainAudioQueue.length - 1]?.audio,
        currentTurnIndex: room.currentTurnIndex,
        totalPlayers: room.playerQueue.length,
      });
    }
  });

  // Mode 6: Draw The Melody 🎨
  socket.on('START_DRAW_MELODY', ({ roomCode, challenge, playerId } = {}, ack) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const room = roomManager.getRoom(resolvedRoomCode);
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    
    if (!room || room.hostId !== pid) {
      if (typeof ack === 'function') ack({ ok: false, message: 'Permission denied' });
      return;
    }

    roomManager.initDrawTheMelody(resolvedRoomCode);
    room.challenge = challenge;
    
    // Randomly select humming player
    const playerIds = Object.keys(room.players);
    const hummingPlayerId = playerIds[Math.floor(Math.random() * playerIds.length)];
    roomManager.setHummingPlayer(resolvedRoomCode, hummingPlayerId);
    
    io.to(resolvedRoomCode).emit('DRAW_MELODY_STARTED', {
      roomCode: resolvedRoomCode,
      challenge,
      hummingPlayer: hummingPlayerId,
      timeToHum: 15,
      timeToDrawPerPlayer: 30,
    });
    
    socket.to(resolvedRoomCode).emit('DRAW_MELODY_ROLE_ASSIGNED', {
      yourRole: 'drawer', // or 'hummer' for the selected player
      hummingPlayerId,
    });
    
    if (typeof ack === 'function') ack({ ok: true });
    console.log(`🎨 Draw The Melody started in room ${resolvedRoomCode}, humming player: ${hummingPlayerId}`);
  });

  socket.on('SUBMIT_HUMMING', ({ roomCode, audioData, playerId } = {}) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    
    roomManager.submitHummingAudio(resolvedRoomCode, audioData);
    
    io.to(resolvedRoomCode).emit('HUMMING_COMPLETE', {
      hummingPlayer: pid,
      readyForDrawing: true,
      drawingTimeLimit: 30,
    });
    console.log(`🎵 Humming submitted in room ${resolvedRoomCode}`);
  });

  socket.on('SUBMIT_DRAWING', ({ roomCode, drawingData, playerId } = {}) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    
    const result = roomManager.submitDrawing(resolvedRoomCode, pid, drawingData);
    const room = roomManager.getRoom(resolvedRoomCode);
    
    io.to(resolvedRoomCode).emit('DRAWING_SUBMITTED', {
      playerId: pid,
      playerName: room.players[pid]?.name,
    });
    
    if (result?.allSubmitted) {
      io.to(resolvedRoomCode).emit('ALL_DRAWINGS_COMPLETE', {
        drawings: room.drawings,
        challenge: room.challenge,
        hummingAudio: room.hummingAudio,
      });
      console.log(`🎨 All drawings submitted in room ${resolvedRoomCode}`);
    }
  });

  socket.on('VOTE_DRAWING', ({ roomCode, playerId, votedForPlayerId } = {}) => {
    const resolvedRoomCode = roomCode || [...socket.rooms].find((r) => r !== socket.id);
    const pid = playerId || socketToPlayer.get(socket.id) || socket.id;
    const room = roomManager.getRoom(resolvedRoomCode);
    
    if (room) {
      if (!room.drawingVotes) room.drawingVotes = {};
      room.drawingVotes[pid] = votedForPlayerId;
      
      io.to(resolvedRoomCode).emit('DRAWING_VOTE_UPDATED', {
        voterId: pid,
        votedFor: votedForPlayerId,
      });
    }
  });

  socket.on('disconnect', () => {
    const pid = socketToPlayer.get(socket.id) || socket.id;
    roomManager.removePlayer(pid);
    socketToPlayer.delete(socket.id);
    console.log(`❌ User disconnected: ${pid} (socket ${socket.id})`);
  });
});

const SOCKET_PORT = process.env.SOCKET_PORT || process.env.PORT || 3003;
const SOCKET_HOST = process.env.SOCKET_HOST || '0.0.0.0';
server.listen(SOCKET_PORT, SOCKET_HOST, () => {
  console.log(`🎵 Melody Mess Server running on ${SOCKET_HOST}:${SOCKET_PORT}`);
});

module.exports = { app, io, roomManager };
