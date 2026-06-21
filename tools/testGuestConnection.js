// Test guest socket connection and GAME_STARTED event
const { io } = require('socket.io-client');

const socketUrl = process.argv[2] || 'https://koppo.onrender.com';
console.log(`Testing guest connection to ${socketUrl}\n`);

const guestSocket = io(socketUrl, {
  path: '/socket.io',
  transports: ['websocket'],
  timeout: 15000,
});

guestSocket.on('connect', () => {
  console.log(`[guest] connected: ${guestSocket.id}`);
  
  // Simulate joining a room
  guestSocket.emit('JOIN_ROOM', {
    roomCode: 'TESTCODE',
    playerId: 'guest_test_' + Date.now(),
    userData: { name: 'Test Guest', photoURL: '' },
  });
});

guestSocket.on('ROOM_JOINED', (data) => {
  console.log(`[guest] ROOM_JOINED:`, data.roomCode, 'hostId:', data.hostId);
  
  // Simulate owner starting game
  setTimeout(() => {
    console.log('[guest] waiting for GAME_STARTED event...');
  }, 500);
});

guestSocket.on('GAME_STARTED', (data) => {
  console.log(`[guest] ✅ GAME_STARTED received!`);
  console.log('  - roomCode:', data.roomCode);
  console.log('  - hostId:', data.hostId);
  console.log('  - players:', Object.keys(data.players || {}).length);
  guestSocket.disconnect();
  process.exit(0);
});

guestSocket.on('JOIN_ERROR', (data) => {
  console.log(`[guest] JOIN_ERROR:`, data.message);
  guestSocket.disconnect();
  process.exit(1);
});

guestSocket.on('connect_error', (err) => {
  console.error('[guest] connection error:', err.message);
  process.exit(1);
});

guestSocket.on('error', (err) => {
  console.error('[guest] socket error:', err);
});

// Auto disconnect after 30s
setTimeout(() => {
  console.log('[guest] timeout - did not receive GAME_STARTED');
  guestSocket.disconnect();
  process.exit(1);
}, 30000);
