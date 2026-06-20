const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const RoomManager = require('./roomManager');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

const roomManager = new RoomManager();

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log(`🎤 User connected: ${socket.id}`);

  // Create or join room
  socket.on('CREATE_ROOM', (userData) => {
    const roomCode = roomManager.createRoom(socket.id, userData);
    socket.join(roomCode);
    socket.emit('ROOM_CREATED', { roomCode, playerId: socket.id });
    console.log(`✨ Room created: ${roomCode}`);
  });

  socket.on('JOIN_ROOM', ({ roomCode, userData }) => {
    const room = roomManager.joinRoom(roomCode, socket.id, userData);
    if (room) {
      socket.join(roomCode);
      socket.emit('ROOM_JOINED', { 
        roomCode, 
        playerId: socket.id, 
        players: room.players 
      });
      io.to(roomCode).emit('PLAYERS_UPDATE', { players: room.players });
      console.log(`➕ Player joined room ${roomCode}`);
    } else {
      socket.emit('JOIN_ERROR', { message: 'Room not found or full' });
    }
  });

  // Mode 1: Battle Singer
  socket.on('START_BATTLE_SINGER', ({ roomCode, mode = 'battle' }) => {
    const room = roomManager.getRoom(roomCode);
    if (room) {
      room.gameMode = 'battle';
      room.gameState = 'SETUP';
      io.to(roomCode).emit('GAME_STARTED', { 
        gameMode: 'battle',
        players: room.players 
      });
    }
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
    const room = roomManager.getRoom(roomCode);
    if (room && room.players[playerId]) {
      if (!room.audioRecordings) room.audioRecordings = {};
      if (!room.audioRecordings[playerId]) room.audioRecordings[playerId] = [];
      room.audioRecordings[playerId].push(audioBlob);
    }
  });

  socket.on('AUDIO_FINISHED', ({ roomCode, playerId, audioData }) => {
    const room = roomManager.getRoom(roomCode);
    if (room) {
      room.players[playerId].audioData = audioData;
      room.players[playerId].recordingComplete = true;

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

  socket.on('VOTE', ({ roomCode, playerId, votedFor }) => {
    const room = roomManager.getRoom(roomCode);
    if (room) {
      if (!room.votes) room.votes = {};
      room.votes[playerId] = votedFor;

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
  socket.on('START_SONG_CHAIN', ({ roomCode }) => {
    const room = roomManager.getRoom(roomCode);
    if (room) {
      room.gameMode = 'chain';
      room.gameState = 'WAITING_ORIGIN';
      room.playerQueue = Object.keys(room.players);
      io.to(roomCode).emit('CHAIN_STARTED', { 
        queue: room.playerQueue,
        currentPlayer: room.playerQueue[0]
      });
    }
  });

  socket.on('disconnect', () => {
    roomManager.removePlayer(socket.id);
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

const SOCKET_PORT = process.env.SOCKET_PORT || process.env.PORT || 3003;
const SOCKET_HOST = process.env.SOCKET_HOST || '0.0.0.0';
server.listen(SOCKET_PORT, SOCKET_HOST, () => {
  console.log(`🎵 Melody Mess Server running on ${SOCKET_HOST}:${SOCKET_PORT}`);
});

module.exports = { app, io, roomManager };
