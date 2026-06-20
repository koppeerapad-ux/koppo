class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  createRoom(hostId, userData) {
    const roomCode = this.generateRoomCode();
    const room = {
      code: roomCode,
      hostId: hostId,
      players: {
        [hostId]: {
          id: hostId,
          ...userData,
          recordingComplete: false,
          votes: 0,
        },
      },
      gameMode: null, // 'battle' or 'chain'
      gameState: 'WAITING', // SETUP, RECORDING, PLAYBACK, VOTING, RESULTS
      challenge: null,
      audioRecordings: {},
      votes: {},
      createdAt: Date.now(),
      maxPlayers: 8,
    };
    this.rooms.set(roomCode, room);
    return roomCode;
  }

  joinRoom(roomCode, playerId, userData) {
    const room = this.rooms.get(roomCode);
    if (!room || Object.keys(room.players).length >= room.maxPlayers) {
      return null;
    }
    room.players[playerId] = {
      id: playerId,
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
}

module.exports = RoomManager;
