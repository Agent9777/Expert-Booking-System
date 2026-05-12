import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    socketRef.current = io(SOCKET_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current.on('connect', () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
