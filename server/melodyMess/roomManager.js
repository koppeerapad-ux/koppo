class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  createRoom(hostPlayerId, userData) {
    const roomCode = this.generateRoomCode();
    const room = {
      code: roomCode,
      hostId: hostPlayerId,
      players: {
        [hostPlayerId]: {
          id: hostPlayerId,
          playerId: hostPlayerId,
          socketId: null,
          isHost: true,
          ...userData,
          recordingComplete: false,
          votes: 0,
        },
      },
      gameMode: null, // 'battle' or 'chain'
      gameState: 'WAITING', // SETUP, RECORDING, PLAYBACK, RESULTS
      challenge: null,
      audioRecordings: {},
      votes: {},
      createdAt: Date.now(),
      maxPlayers: 8,
    };
    this.rooms.set(roomCode, room);
    return roomCode;
  }

  joinRoom(roomCode, playerId, userData, socketId = null) {
    const room = this.rooms.get(roomCode);
    if (!room) {
      return null;
    }
    // If the player is not already in the room, check the maximum player limit
    if (!room.players[playerId] && Object.keys(room.players).length >= room.maxPlayers) {
      return null;
    }
    const isPlayerHost = room.hostId === playerId;
    room.players[playerId] = {
      id: playerId,
      playerId,
      socketId,
      isHost: isPlayerHost,
      ...userData,
      recordingComplete: false,
      votes: 0,
    };
    return room;
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  removePlayer(playerId) {
    for (const [roomCode, room] of this.rooms) {
      if (room.players[playerId]) {
        delete room.players[playerId];
        if (Object.keys(room.players).length === 0) {
          this.rooms.delete(roomCode);
          console.log(`🗑️ Room ${roomCode} deleted (empty)`);
        }
      }
    }
  }

  calculateVotes(room) {
    const results = {};
    for (const [voterId, votedFor] of Object.entries(room.votes)) {
      if (!results[votedFor]) {
        results[votedFor] = {
          playerId: votedFor,
          playerName: room.players[votedFor]?.name,
          votes: 0,
        };
      }
      results[votedFor].votes++;
    }
    return Object.values(results).sort((a, b) => b.votes - a.votes);
  }

  // Game Mode: Barking Battle
  initBarkingBattle(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    room.gameMode = 'barking_battle';
    room.gameState = 'RECORDING';
    room.barkScores = {};
    room.barkTimer = 30; // 30 seconds
    
    Object.keys(room.players).forEach(playerId => {
      room.barkScores[playerId] = 0;
    });
    
    return room;
  }

  addBarkScore(roomCode, playerId, points = 1) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.barkScores) return null;
    room.barkScores[playerId] = (room.barkScores[playerId] || 0) + points;
    return room.barkScores;
  }

  finalizeBarkingBattle(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.barkScores) return null;
    
    room.gameState = 'RESULTS';
    const results = Object.entries(room.barkScores)
      .map(([playerId, score]) => ({
        playerId,
        playerName: room.players[playerId]?.name,
        score,
      }))
      .sort((a, b) => b.score - a.score);
    
    return results;
  }

  // Game Mode: Broken Karaoke Chain
  initBrokenKaraokeChain(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    room.gameMode = 'broken_karaoke_chain';
    room.gameState = 'SETUP';
    room.playerQueue = Object.keys(room.players);
    room.currentTurnIndex = 0;
    room.chainAudioQueue = [];
    room.challenge = null; // Will be set by host
    
    return room;
  }

  getCurrentTurnPlayer(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room || !room.playerQueue) return null;
    return room.playerQueue[room.currentTurnIndex] || null;
  }

  submitChainAudio(roomCode, audioData) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    room.chainAudioQueue.push(audioData);
    
    // Move to next player
    room.currentTurnIndex++;
    
    if (room.currentTurnIndex >= room.playerQueue.length) {
      room.gameState = 'PLAYBACK';
      return { allSubmitted: true, queue: room.chainAudioQueue };
    }
    
    return { allSubmitted: false, nextPlayer: room.playerQueue[room.currentTurnIndex] };
  }

  // Game Mode: Broken Karaoke Classic
  initBrokenKaraokeClassic(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    room.gameMode = 'broken_karaoke_classic';
    room.gameState = 'SETUP';
    room.playerQueue = Object.keys(room.players);
    room.currentTurnIndex = 0;
    room.whisperChainAudioQueue = [];
    room.challenge = null; // Original song/lyrics
    
    return room;
  }

  submitWhisperChainAudio(roomCode, audioData) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    room.whisperChainAudioQueue.push(audioData);
    
    // Move to next player
    room.currentTurnIndex++;
    
    if (room.currentTurnIndex >= room.playerQueue.length) {
      room.gameState = 'PLAYBACK';
      return { allSubmitted: true, queue: room.whisperChainAudioQueue };
    }
    
    return { allSubmitted: false, nextPlayer: room.playerQueue[room.currentTurnIndex] };
  }

  // Game Mode: Draw The Melody
  initDrawTheMelody(roomCode) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    room.gameMode = 'draw_the_melody';
    room.gameState = 'SETUP';
    room.hummingPlayer = null; // Will be randomly selected
    room.hummingAudio = null;
    room.drawings = {}; // { playerId: drawingData }
    room.challenge = null; // Song name/hint
    
    return room;
  }

  setHummingPlayer(roomCode, playerId) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    room.hummingPlayer = playerId;
    return room;
  }

  submitHummingAudio(roomCode, audioData) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    room.hummingAudio = audioData;
    room.gameState = 'DRAWING';
    
    return { success: true, readyForDrawing: true };
  }

  submitDrawing(roomCode, playerId, drawingData) {
    const room = this.rooms.get(roomCode);
    if (!room) return null;
    
    room.drawings[playerId] = drawingData;
    
    // Check if all players (except humming player) have submitted
    const drawingPlayersCount = Object.keys(room.players).length - 1;
    if (Object.keys(room.drawings).length >= drawingPlayersCount) {
      room.gameState = 'RESULTS';
      return { allSubmitted: true };
    }
    
    return { allSubmitted: false };
  }
}

module.exports = RoomManager;
