const io = require('socket.io-client');
const url = 'https://koppo.onrender.com';
console.log('Connecting to', url);
const socket = io(url, {
  transports: ['websocket'],
  timeout: 10000,
  reconnection: false,
});
socket.on('connect', () => {
  console.log('CONNECTED', socket.id);
  socket.disconnect();
  process.exit(0);
});
socket.on('connect_error', (err) => {
  console.error('CONNECT_ERROR', err.message || err);
  process.exit(1);
});
socket.on('error', (err) => {
  console.error('ERROR', err.message || err);
  process.exit(1);
});
