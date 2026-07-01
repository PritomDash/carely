import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000', {
  transports: ['websocket'],
});

export default socket;
