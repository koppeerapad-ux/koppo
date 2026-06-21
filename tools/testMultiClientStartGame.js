const { io } = require('socket.io-client');

const url = process.argv[2] || 'http://localhost:3003';
const ownerId = `owner_${Date.now()}`;
const guestId = `guest_${Date.now()}`;

let owner, guest;
let roomCode;

function createOwner() {
  owner = io(url, { transports: ['websocket'], timeout: 10000, forceNew: true });
  owner.on('connect', () => {
    console.log('[owner] connect', owner.id);
    owner.emit('CREATE_ROOM', { playerId: ownerId, userData: { name: 'Owner' } });
  });

  owner.on('ROOM_CREATED', (data) => {
    console.log('[owner] ROOM_CREATED', data.roomCode, data.hostId);
    roomCode = data.roomCode;
    setTimeout(createGuest, 500);
  });

  owner.on('GAME_STARTED', (data) => {
    console.log('[owner] GAME_STARTED state for owner', data);
  });
}

function createGuest() {
  guest = io(url, { transports: ['websocket'], timeout: 10000, forceNew: true });
  guest.on('connect', () => {
    console.log('[guest] connect', guest.id);
    guest.emit('JOIN_ROOM', { roomCode, playerId: guestId, userData: { name: 'Guest' } });
  });

  guest.on('ROOM_JOINED', (data) => {
    console.log('[guest] ROOM_JOINED', data.roomCode, data.hostId, data.playerId);
    setTimeout(() => {
      owner.emit('START_BATTLE_SINGER', { roomCode });
    }, 500);
  });

  guest.on('GAME_STARTED', (data) => {
    console.log('[guest] GAME_STARTED state for guest', data);
    console.log('[guest] test success if guest received GAME_STARTED');
    process.exit(0);
  });

  guest.on('connect_error', (err) => {
    console.error('[guest] connect_error', err);
    process.exit(2);
  });
}

createOwner();
setTimeout(() => {
  console.error('timeout waiting for test');
  process.exit(1);
}, 15000);
