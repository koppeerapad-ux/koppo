const { io } = require('socket.io-client');

const url = process.argv[2] || 'https://koppo.onrender.com';
console.log('Testing socket connection to', url);

const socket = io(url, {
  transports: ['websocket'],
  timeout: 10000,
  reconnectionAttempts: 0,
  forceNew: true,
  extraHeaders: {
    Origin: 'https://testweb67-9c814.web.app'
  }
});

socket.on('connect', () => {
  console.log('connected, id=', socket.id);
  socket.close();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.error('connect_error:', err);
  process.exit(2);
});

socket.on('error', (err) => {
  console.error('error:', err);
  process.exit(3);
});

setTimeout(() => {
  console.error('timeout waiting for connect');
  process.exit(4);
}, 15000);
