import { useState, useEffect, useRef, useCallback } from 'react';
import type { RoomState, GameActionType } from '@mtgc/shared';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

interface UseGameSocketOptions {
  roomCode: string;
  playerId: string;
  playerName: string;
  isSpectator?: boolean;
  enabled?: boolean;
}

export function useGameSocket({
  roomCode,
  playerId,
  playerName,
  isSpectator = false,
  enabled = true,
}: UseGameSocketOptions) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!enabled || !roomCode || !playerId) return;

    // Close any previous connection cleanly
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setStatus(reconnectAttemptsRef.current > 0 ? 'reconnecting' : 'connecting');
    setErrorMessage(null);

    // Build WebSocket URL (using relative protocol for dev proxy compatibility)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If in development with Vite proxy on port 3000, ws to localhost:3001
    const host =
      window.location.port === '3000' ? `${window.location.hostname}:3001` : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/table/${roomCode.toUpperCase()}?playerId=${encodeURIComponent(
      playerId,
    )}&playerName=${encodeURIComponent(playerName)}&spectator=${isSpectator ? 'true' : 'false'}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ROOM_STATE_SYNC') {
            setRoomState(data.roomState);
          } else if (data.type === 'ACTION_REJECTED') {
            console.warn('[WS Rejected Action]:', data.error);
          } else if (data.type === 'ERROR') {
            setErrorMessage(data.message || 'Error en la conexión a la sala');
          }
        } catch (err) {
          console.error('[WS Parse Error]:', err);
        }
      };

      ws.onclose = () => {
        setStatus('disconnected');
        socketRef.current = null;

        // Auto-reconnect with exponential backoff if enabled
        if (enabled && reconnectAttemptsRef.current < 8) {
          const delay = Math.min(1000 * Math.pow(1.5, reconnectAttemptsRef.current), 10000);
          reconnectAttemptsRef.current++;
          setStatus('reconnecting');
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        // ws.onclose will handle the retry
      };
    } catch (err) {
      console.error('[WS Init Error]:', err);
      setStatus('disconnected');
    }
  }, [enabled, roomCode, playerId, playerName, isSpectator]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  const sendAction = useCallback((type: GameActionType, payload: unknown) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type,
          payload,
          clientTimestamp: Date.now(),
        }),
      );
    } else {
      console.warn('[WS Send Warning]: Socket no está conectado');
    }
  }, []);

  return {
    status,
    roomState,
    errorMessage,
    sendAction,
    reconnect: connect,
  };
}
