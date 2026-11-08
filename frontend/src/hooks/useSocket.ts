'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

export const useSocket = () => {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('[Socket] Connected to server with ID:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('[Socket] Disconnected from server');
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const joinConversation = useCallback((conversationId: string) => {
    if (socketRef.current) {
      if (activeConversationId) {
        socketRef.current.emit('conversation:leave', { conversationId: activeConversationId });
      }
      socketRef.current.emit('conversation:join', { conversationId });
      setActiveConversationId(conversationId);
    }
  }, [activeConversationId]);

  const leaveConversation = useCallback((conversationId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('conversation:leave', { conversationId });
      if (activeConversationId === conversationId) {
        setActiveConversationId(null);
      }
    }
  }, [activeConversationId]);

  const onMessageReceived = useCallback((callback: (message: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off('message:received');
      socketRef.current.on('message:received', callback);
    }
  }, []);

  const onTypingUpdate = useCallback((callback: (data: any) => void) => {
    if (socketRef.current) {
      socketRef.current.off('typing:update');
      socketRef.current.on('typing:update', callback);
    }
  }, []);

  const emitTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (socketRef.current) {
      socketRef.current.emit(isTyping ? 'typing:start' : 'typing:stop', { conversationId });
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    joinConversation,
    leaveConversation,
    onMessageReceived,
    onTypingUpdate,
    emitTyping,
  };
};

