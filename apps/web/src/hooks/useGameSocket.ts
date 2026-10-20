import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  RoomState,
  GameActionType,
  RemoteCardDraggingPayload,
  CardInstance,
} from '@mtgc/shared';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
export type RemoteDragState = RemoteCardDraggingPayload & {
  pendingSync?: boolean;
  isFirstMessage?: boolean;
};

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
  const [remoteDraggingCards, setRemoteDraggingCards] = useState<Record<string, RemoteDragState>>(
    {},
  );
  const [revealedCard, setRevealedCard] = useState<{
    card: CardInstance;
    fromPlayerId: string;
    fromPlayerName: string;
    targetPlayerId?: string;
    targetPlayerName?: string;
  } | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const remoteDragTimeoutsRef = useRef<Record<string, NodeJS.Timeout>>({});

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
            // Punto 1: Al llegar el nuevo estado autoritativo, limpiar en el mismo frame de render
            // cualquier carta que estuviese en pendingSync, eliminando el parpadeo en el jugador receptor.
            setRemoteDraggingCards(prev => {
              let hasPending = false;
              for (const k in prev) {
                if (prev[k]?.pendingSync) {
                  hasPending = true;
                  break;
                }
              }
              if (!hasPending) return prev;
              const next = { ...prev };
              for (const k in next) {
                if (next[k]?.pendingSync) {
                  delete next[k];
                  if (remoteDragTimeoutsRef.current[k]) {
                    clearTimeout(remoteDragTimeoutsRef.current[k]);
                    delete remoteDragTimeoutsRef.current[k];
                  }
                }
              }
              return next;
            });
          } else if (data.type === 'REMOTE_CARD_DRAGGING') {
            const payload = data.payload as RemoteDragState;
            const cardId = payload.cardInstanceId;

            // Limpiar temporizador previo para esta carta si existía
            if (remoteDragTimeoutsRef.current[cardId]) {
              clearTimeout(remoteDragTimeoutsRef.current[cardId]);
              delete remoteDragTimeoutsRef.current[cardId];
            }

            setRemoteDraggingCards(prev => {
              if (!payload.isDragging) {
                // Punto 1: Si viene con posición final (soltado), mantenemos la carta oculta en su posición vieja
                // y mostramos el fantasma en la posición final hasta que llegue ROOM_STATE_SYNC.
                if (payload.position) {
                  return {
                    ...prev,
                    [cardId]: {
                      ...payload,
                      isDragging: false,
                      pendingSync: true,
                      isFirstMessage: false,
                    },
                  };
                }
                if (!prev[cardId]) return prev;
                const next = { ...prev };
                delete next[cardId];
                return next;
              }

              const isFirst = !prev[cardId];
              return {
                ...prev,
                [cardId]: {
                  ...payload,
                  isFirstMessage: isFirst,
                },
              };
            });

            // Timeout de seguridad de 1 segundo si no llegan más mensajes, falla la red o hay desconexión
            remoteDragTimeoutsRef.current[cardId] = setTimeout(() => {
              setRemoteDraggingCards(prev => {
                if (!prev[cardId]) return prev;
                const next = { ...prev };
                delete next[cardId];
                return next;
              });
              delete remoteDragTimeoutsRef.current[cardId];
            }, 1000);
          } else if (data.type === 'CARD_REVEALED') {
            setRevealedCard(data.payload);
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
        // Limpiar timeouts y cartas en arrastre remoto al desconectar
        Object.values(remoteDragTimeoutsRef.current).forEach(t => clearTimeout(t));
        remoteDragTimeoutsRef.current = {};
        setRemoteDraggingCards({});
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
    remoteDraggingCards,
    revealedCard,
    dismissRevealedCard: () => setRevealedCard(null),
    sendAction,
    reconnect: connect,
  };
}
