import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const socket = io(BACKEND_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});

export default socket;
