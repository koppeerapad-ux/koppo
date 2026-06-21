const { io } = require('socket.io-client');

const url = process.argv[2] || 'http://localhost:3003';
const pid = `test_${Date.now()}`;
console.log('Connecting to', url, 'as', pid);

const socket = io(url, { transports: ['websocket'], timeout: 10000, forceNew: true });

socket.on('connect', () => {
  console.log('connected, id=', socket.id);
  socket.emit('CREATE_ROOM', { playerId: pid, userData: { name: 'Tester', photoURL: '' } });
});

socket.on('ROOM_CREATED', (data) => {
  console.log('ROOM_CREATED', data);
  const { roomCode } = data;
  // start the game as host
  setTimeout(() => {
    console.log('Starting game for room', roomCode);
    socket.emit('START_BATTLE_SINGER', { roomCode });
  }, 500);
});

socket.on('GAME_STARTED', (data) => {
  console.log('GAME_STARTED', data);
  socket.close();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('connect_error', err);
  process.exit(2);
});

setTimeout(() => {
  console.error('timeout waiting for flow');
  process.exit(3);
}, 10000);
