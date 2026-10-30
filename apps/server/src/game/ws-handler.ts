import { cardSearchService } from '../services/card-search.service.js';
import { WebSocket } from 'ws';
import {
  ActionEnvelopeSchema,
  AdjustLifeSchema,
  SetLifeSchema,
  SetPlayerStatusSchema,
  CommanderDamageSchema,
  SetPlayerCounterSchema,
  SetCardCounterSchema,
  MoveCardSchema,
  TapCardSchema,
  FlipCardSchema,
  CloneTokenSchema,
  CreateTokenSchema,
  DrawCardsSchema,
  RollDiceSchema,
  ChatMessageSchema,
  ConfirmUndoSchema,
  KickPlayerSchema,
  TransferHostSchema,
  UpdateRoomSettingsSchema,
  SetTurnOrderSchema,
  SelectDeckSchema,
  SetReadySchema,
  StartGameSchema,
  SetPlaymatSchema,
  CardDragMoveSchema,
  MulliganKeepSchema,
  MulliganForceDecisionSchema,
  RevealCardSchema,
  UnrevealCardSchema,
  SetTargetingArrowSchema,
  ClearTargetingArrowsSchema,
  SetCardPTSchema,
  ToggleCardKeywordSchema,
} from '@mtgc/shared';
import { roomManager } from './room-manager.js';
import { filterRoomStateForPlayer } from './visibility-filter.js';
import { redisSnapshotService } from '../services/redis-snapshot.service.js';

interface ClientConnection {
  socket: WebSocket;
  roomCode: string;
  playerId: string;
  playerName: string;
  isSpectator: boolean;
  clientIp?: string;
}

export class WebSocketHandler {
  // roomCode -> Set of ClientConnections
  private roomClients = new Map<string, Set<ClientConnection>>();
  // clientIp -> Set of ClientConnections
  private ipConnections = new Map<string, Set<ClientConnection>>();
  // Topes de conexiones concurrentes para mitigar ataques y abusos de recursos (Puntos A2.2 y A3.3)
  // Se eleva a 30 por IP para permitir redes locales / hogares compartidos y CGNAT con hasta 6 jugadores legítimos
  public readonly MAX_CONNECTIONS_PER_IP = 30;
  public readonly MAX_CONNECTIONS_PER_TABLE = 12;

  // playerId -> message timestamps in sliding window (REQ-12.4, REQ-16.4)
  private messageRateLimits = new Map<string, number[]>();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private snapshotThrottleTimers = new Map<string, { lastSaved: number; timer?: NodeJS.Timeout }>();

  /**
   * Persiste la instantánea en PostgreSQL con throttling (máx 1/s por sala, inmediato en cambios de turno) (Punto A4.4)
   */
  private queueSnapshotSave(roomCode: string, state: any, immediate: boolean = false): void {
    const code = roomCode.toUpperCase();
    const now = Date.now();
    const entry = this.snapshotThrottleTimers.get(code) || { lastSaved: 0 };

    const doSave = () => {
      entry.lastSaved = Date.now();
      if (entry.timer) {
        clearTimeout(entry.timer);
        entry.timer = undefined;
      }
      this.snapshotThrottleTimers.set(code, entry);
      redisSnapshotService.save(code, state).catch(() => {});
    };

    if (immediate || now - entry.lastSaved >= 1000) {
      doSave();
    } else if (!entry.timer) {
      entry.timer = setTimeout(doSave, 1000 - (now - entry.lastSaved));
      this.snapshotThrottleTimers.set(code, entry);
    }
  }

  constructor() {
    // Ping all open sockets every 25 seconds to prevent cloud router idle disconnects (Heroku H15)
    this.heartbeatTimer = setInterval(() => {
      for (const clients of this.roomClients.values()) {
        for (const c of clients) {
          if (c.socket.readyState === WebSocket.OPEN) {
            try {
              c.socket.ping();
            } catch {}
          }
        }
      }
    }, 25000);
    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  /**
   * Checks sliding window rate limit (max 5 messages per 10 seconds)
   */
  public checkRateLimit(playerId: string, maxMessages = 5, windowMs = 10000): boolean {
    const now = Date.now();
    const timestamps = this.messageRateLimits.get(playerId) || [];
    const recent = timestamps.filter(t => now - t < windowMs);
    if (recent.length >= maxMessages) {
      this.messageRateLimits.set(playerId, recent);
      return false;
    }
    recent.push(now);
    this.messageRateLimits.set(playerId, recent);
    return true;
  }

  // playerId -> drag message timestamps in sliding window (separate rate limit, ~60 msg/sec)
  private dragRateLimits = new Map<string, number[]>();

  /**
   * Checks sliding window rate limit for live card dragging (~60 msg/s, ephemeral)
   */
  public checkDragRateLimit(playerId: string, maxMessages = 60, windowMs = 1000): boolean {
    const now = Date.now();
    const timestamps = this.dragRateLimits.get(playerId) || [];
    const recent = timestamps.filter(t => now - t < windowMs);
    if (recent.length >= maxMessages) {
      this.dragRateLimits.set(playerId, recent);
      return false;
    }
    recent.push(now);
    this.dragRateLimits.set(playerId, recent);
    return true;
  }

  /**
   * Registers a new WebSocket connection to a room
   */
  public handleConnection(
    socket: WebSocket,
    roomCode: string,
    playerInfo: { playerId: string; playerName: string; isSpectator?: boolean; token?: string },
    clientIp?: string,
  ): void {
    const code = roomCode.toUpperCase();
    const cleanIp = clientIp || 'unknown';

    // 1. Tope de conexiones concurrentes por IP (Punto A2.2)
    if (cleanIp !== 'unknown') {
      const ipConns = this.ipConnections.get(cleanIp);
      if (ipConns && ipConns.size >= this.MAX_CONNECTIONS_PER_IP) {
        console.warn(
          `[WS_REJECTED] IP ${cleanIp} alcanzó el tope de conexiones WebSocket (${this.MAX_CONNECTIONS_PER_IP})`,
        );
        socket.send(
          JSON.stringify({
            type: 'ERROR',
            message: 'Demasiadas conexiones activas desde tu dirección IP.',
            reason: 'ip_connection_cap',
          }),
        );
        socket.close(1008, 'IP connection cap exceeded');
        return;
      }
    }

    let session = roomManager.getSession(code);

    // 2. Verificar existencia de la mesa con motivo estructurado (Punto A2.2 / F3)
    if (!session) {
      console.warn(
        `[WS_REJECTED] Mesa "${code}" no encontrada o expirada (solicitada por ${playerInfo.playerName} desde IP ${cleanIp})`,
      );
      socket.send(
        JSON.stringify({
          type: 'ERROR',
          message: `La mesa "${code}" no existe o ha expirado.`,
          reason: 'room_not_found',
        }),
      );
      socket.close(1008, 'Room not found');
      return;
    }

    // 3. Tope de conexiones concurrentes por mesa (Punto A2.2)
    const existingTableClients = this.roomClients.get(code);
    if (existingTableClients && existingTableClients.size >= this.MAX_CONNECTIONS_PER_TABLE) {
      console.warn(
        `[WS_REJECTED] Mesa "${code}" alcanzó el tope de conexiones simultáneas (${this.MAX_CONNECTIONS_PER_TABLE})`,
      );
      socket.send(
        JSON.stringify({
          type: 'ERROR',
          message: 'La mesa ha alcanzado el límite máximo de conexiones permitidas.',
          reason: 'table_connection_cap',
        }),
      );
      socket.close(1008, 'Table connection cap exceeded');
      return;
    }

    // Join room or reconnect with structured rejection handling (Punto F3)
    let player: any;
    try {
      const joinResult = roomManager.joinRoom(code, playerInfo);
      player = joinResult.player;
    } catch (err: any) {
      const errMsg = err?.message || 'Error al unirse a la sala';
      const reason = errMsg.toLowerCase().includes('llena') ? 'room_full' : 'join_rejected';
      console.warn(
        `[WS_REJECTED] ${playerInfo.playerName} no pudo unirse a ${code}: ${errMsg} [reason: ${reason}]`,
      );
      socket.send(
        JSON.stringify({
          type: 'ERROR',
          message: errMsg,
          reason,
        }),
      );
      socket.close(4003, reason);
      return;
    }

    const client: ClientConnection = {
      socket,
      roomCode: code,
      playerId: player.id,
      playerName: player.name,
      isSpectator: player.isSpectator,
      clientIp: cleanIp,
    };

    if (!this.roomClients.has(code)) {
      this.roomClients.set(code, new Set());
    }
    this.roomClients.get(code)!.add(client);

    if (cleanIp !== 'unknown') {
      if (!this.ipConnections.has(cleanIp)) {
        this.ipConnections.set(cleanIp, new Set());
      }
      this.ipConnections.get(cleanIp)!.add(client);
    }

    console.log(`[WS] ${player.name} (${player.id}) conectado a mesa ${code} [IP: ${cleanIp}]`);

    // Broadcast updated state to all clients in this room (with visibility filters)
    this.broadcastRoomState(code);

    // Setup incoming messages
    socket.on('message', (data: Buffer | string) => {
      this.handleClientAction(client, data.toString());
    });

    socket.on('close', () => {
      this.handleClientDisconnect(client);
    });
  }

  /**
   * Handles incoming player game actions
   */
  private async handleClientAction(client: ClientConnection, rawMessage: string): Promise<void> {
    const session = roomManager.getSession(client.roomCode);
    if (!session) return;

    let parsedJson: any;
    try {
      parsedJson = JSON.parse(rawMessage);
    } catch {
      client.socket.send(
        JSON.stringify({
          type: 'ACTION_REJECTED',
          error: 'JSON malformado',
        }),
      );
      return;
    }

    // Heartbeat / Keepalive for cloud proxies (e.g. Heroku router 55s H15 idle timeout)
    if (parsedJson?.type === 'PING') {
      try {
        client.socket.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
      } catch {}
      return;
    }

    const parseResult = ActionEnvelopeSchema.safeParse(parsedJson);
    if (!parseResult.success) {
      client.socket.send(
        JSON.stringify({
          type: 'ACTION_REJECTED',
          error: 'Formato de acción inválido',
          details: parseResult.error.flatten(),
        }),
      );
      return;
    }
    const envelope = parseResult.data;

    const { type, payload } = envelope;

    // Spectator restriction: spectators can only chat or roll dice
    if (client.isSpectator && type !== 'CHAT_MESSAGE' && type !== 'ROLL_DICE') {
      client.socket.send(
        JSON.stringify({
          type: 'ACTION_REJECTED',
          reason: 'spectator_action_forbidden',
          error: 'Los espectadores solo pueden enviar mensajes o tirar dados.',
        }),
      );
      return;
    }

    // Ephemeral live card dragging for rivals (Punto 5, REQ-9)
    if (type === 'CARD_DRAG_MOVE') {
      const allowed = this.checkDragRateLimit(client.playerId, 60, 1000);
      if (!allowed) {
        return;
      }
      try {
        const valid = CardDragMoveSchema.parse(payload);
        const clientsInRoom = this.roomClients.get(client.roomCode);
        if (clientsInRoom) {
          const ephemeralMsg = JSON.stringify({
            type: 'REMOTE_CARD_DRAGGING',
            payload: {
              playerId: client.playerId,
              playerName: client.playerName,
              cardInstanceId: valid.cardInstanceId,
              isDragging: valid.isDragging,
              position: valid.position,
              cardDefinition: valid.cardDefinition,
              fromZone: valid.fromZone,
              isTapped: valid.isTapped,
            },
          });
          for (const c of clientsInRoom) {
            if (c.playerId !== client.playerId && c.socket.readyState === WebSocket.OPEN) {
              c.socket.send(ephemeralMsg);
            }
          }
        }
      } catch {
        // Silently ignore malformed ephemeral drag frames
      }
      return;
    }

    try {
      switch (type) {
        case 'ADJUST_LIFE': {
          const valid = AdjustLifeSchema.parse(payload);
          session.adjustLife({
            playerId: valid.playerId || client.playerId,
            delta: valid.delta,
          });
          break;
        }

        case 'SET_LIFE': {
          const valid = SetLifeSchema.parse(payload);
          session.setLife({
            playerId: valid.playerId || client.playerId,
            life: valid.life,
          });
          break;
        }

        case 'SET_PLAYER_STATUS': {
          const valid = SetPlayerStatusSchema.parse(payload);
          session.setPlayerStatus({
            ...valid,
            playerId: valid.playerId || client.playerId,
          });
          break;
        }

        case 'COMMANDER_DAMAGE': {
          const valid = CommanderDamageSchema.parse(payload);
          session.adjustCommanderDamage(valid, client.playerId);
          break;
        }

        case 'SET_PLAYER_COUNTER': {
          const valid = SetPlayerCounterSchema.parse(payload);
          session.setPlayerCounter({
            playerId: valid.playerId || client.playerId,
            counterType: valid.counterType,
            delta: valid.delta,
          });
          break;
        }

        case 'SET_CARD_COUNTER': {
          const valid = SetCardCounterSchema.parse(payload);
          session.setCardCounter(client.playerId, valid);
          break;
        }

        case 'SET_CARD_PT': {
          const valid = SetCardPTSchema.parse(payload);
          session.setCardPT(client.playerId, valid);
          break;
        }

        case 'TOGGLE_CARD_KEYWORD': {
          const valid = ToggleCardKeywordSchema.parse(payload);
          session.toggleCardKeyword(client.playerId, valid);
          break;
        }

        case 'DRAW_CARDS': {
          const valid = DrawCardsSchema.parse(payload);
          session.drawCards(client.playerId, valid.count);
          break;
        }

        case 'MULLIGAN': {
          session.mulliganService.onStateChanged = () => this.broadcastRoomState(client.roomCode);
          session.mulligan(client.playerId);
          break;
        }

        case 'MULLIGAN_TAKE': {
          session.mulliganService.onStateChanged = () => this.broadcastRoomState(client.roomCode);
          session.takeMulligan(client.playerId);
          break;
        }

        case 'MULLIGAN_KEEP': {
          const valid = MulliganKeepSchema.parse(payload);
          session.mulliganService.onStateChanged = () => this.broadcastRoomState(client.roomCode);
          session.keepHand(client.playerId, valid.bottomCardIds);
          break;
        }

        case 'MULLIGAN_FORCE_DECISION': {
          const valid = MulliganForceDecisionSchema.parse(payload);
          session.mulliganService.onStateChanged = () => this.broadcastRoomState(client.roomCode);
          session.forceMulliganDecision(client.playerId, valid.targetPlayerId);
          break;
        }

        case 'SHUFFLE_LIBRARY': {
          session.shuffleLibrary(client.playerId);
          break;
        }

        case 'MOVE_CARD': {
          const valid = MoveCardSchema.parse(payload);
          session.moveCard(client.playerId, valid as any);
          break;
        }

        case 'REVEAL_CARD': {
          const valid = RevealCardSchema.parse(payload);
          const result = session.revealCard(client.playerId, valid);
          if (result) {
            const revealedMsg = JSON.stringify({
              type: 'CARD_REVEALED',
              payload: {
                card: result.card,
                fromPlayerId: result.fromPlayerId,
                fromPlayerName: result.fromPlayerName,
                targetPlayerId: result.targetPlayerId,
                targetPlayerName: result.targetPlayerName,
              },
            });

            const clients = this.roomClients.get(client.roomCode);
            if (clients) {
              for (const c of clients) {
                if (c.socket.readyState !== WebSocket.OPEN) continue;
                if (result.targetPlayerId) {
                  if (c.playerId === result.targetPlayerId || c.playerId === result.fromPlayerId) {
                    c.socket.send(revealedMsg);
                  }
                } else {
                  c.socket.send(revealedMsg);
                }
              }
            }

            this.broadcastRoomState(client.roomCode);
          }
          break;
        }

        case 'UNREVEAL_CARD': {
          const valid = UnrevealCardSchema.parse(payload);
          const success = session.unrevealCard(client.playerId, valid);
          if (success) {
            this.broadcastRoomState(client.roomCode);
          }
          break;
        }

        case 'SET_TARGETING_ARROW': {
          const valid = SetTargetingArrowSchema.parse(payload);
          session.setTargetingArrow(client.playerId, valid as any);
          this.broadcastRoomState(client.roomCode);
          break;
        }

        case 'CLEAR_TARGETING_ARROWS': {
          const valid = ClearTargetingArrowsSchema.parse(payload);
          session.clearTargetingArrows(client.playerId, valid);
          this.broadcastRoomState(client.roomCode);
          break;
        }

        case 'TAP_CARD': {
          const valid = TapCardSchema.parse(payload);
          session.tapCard(client.playerId, valid);
          break;
        }

        case 'UNTAP_ALL': {
          session.untapAll(client.playerId);
          break;
        }

        case 'FLIP_CARD': {
          const valid = FlipCardSchema.parse(payload);
          session.flipCard(client.playerId, valid);
          break;
        }

        case 'CLONE_TOKEN': {
          const valid = CloneTokenSchema.parse(payload);
          session.cloneToken(client.playerId, valid);
          break;
        }

        case 'CREATE_TOKEN': {
          const valid = CreateTokenSchema.parse(payload);
          session.createToken(client.playerId, valid);
          break;
        }

        case 'PASS_TURN': {
          session.passTurn(client.playerId);
          break;
        }

        case 'SET_TURN_ORDER': {
          const valid = SetTurnOrderSchema.parse(payload);
          session.setTurnOrder(client.playerId, valid.turnOrder);
          break;
        }

        case 'ROLL_DICE': {
          const valid = RollDiceSchema.parse(payload);
          session.rollDice(client.playerId, valid.sides);
          break;
        }

        case 'UNDO_LAST': {
          session.undoLast(client.playerId);
          break;
        }

        case 'CONFIRM_UNDO': {
          const valid = ConfirmUndoSchema.parse(payload);
          session.confirmUndo(client.playerId, valid);
          break;
        }

        case 'CHAT_MESSAGE': {
          const allowed = this.checkRateLimit(client.playerId, 5, 10000);
          if (!allowed) {
            client.socket.send(
              JSON.stringify({
                type: 'RATE_LIMIT_EXCEEDED',
                reason: 'rate_limit_exceeded',
                error: 'Límite de chat excedido: máximo 5 mensajes cada 10 segundos.',
              }),
            );
            return;
          }
          const valid = ChatMessageSchema.parse(payload);
          session.addChatMessage(client.playerId, valid.message);
          break;
        }

        case 'LOAD_DECK': {
          const deckData = payload as { commanderCards: any[]; maindeckCards: any[] };
          if (Array.isArray(deckData.commanderCards) && Array.isArray(deckData.maindeckCards)) {
            session.loadDeck(client.playerId, deckData.commanderCards, deckData.maindeckCards);
          }
          break;
        }

        case 'KICK_PLAYER': {
          const valid = KickPlayerSchema.parse(payload);
          const kicked = roomManager.kickPlayer(client.roomCode, client.playerId, valid);

          const clientsInRoom = this.roomClients.get(client.roomCode);
          if (clientsInRoom) {
            for (const c of clientsInRoom) {
              if (c.playerId === kicked.kickedPlayerId && c.socket.readyState === WebSocket.OPEN) {
                c.socket.send(
                  JSON.stringify({
                    type: 'PLAYER_KICKED',
                    message: 'Has sido expulsado de la mesa por el anfitrión.',
                  }),
                );
                c.socket.close(4001, 'Kicked by host');
              }
            }
          }
          break;
        }

        case 'TRANSFER_HOST': {
          const valid = TransferHostSchema.parse(payload);
          roomManager.transferHost(client.roomCode, client.playerId, valid);
          break;
        }

        case 'UPDATE_ROOM_SETTINGS': {
          const valid = UpdateRoomSettingsSchema.parse(payload);
          roomManager.updateRoomSettings(client.roomCode, client.playerId, valid);
          break;
        }

        case 'SELECT_DECK': {
          const valid = SelectDeckSchema.parse(payload);
          // Invalidate/sanitize any stale art_series or broken card definitions before assigning to player library
          if (Array.isArray(valid.maindeckCards)) {
            for (let i = 0; i < valid.maindeckCards.length; i++) {
              const card = valid.maindeckCards[i];
              if (
                card &&
                (card.layout === 'art_series' ||
                  card.typeLine === 'Card // Card' ||
                  card.scryfallId === '6894b688-4966-4277-8e11-d3c91042180c' ||
                  (card.imageUrlNormal && card.imageUrlNormal.includes('/art_crop/')) ||
                  (!card.oracleText &&
                    !card.typeLine?.includes('Land') &&
                    !card.typeLine?.includes('Card')))
              ) {
                try {
                  const resolved = await cardSearchService.resolveSingleCard(card.name, 'en');
                  if (resolved) {
                    valid.maindeckCards[i] = resolved;
                  }
                } catch {
                  // Fall back to original if resolution fails
                }
              }
            }
          }
          session.selectDeck(client.playerId, valid as any);
          break;
        }

        case 'DESELECT_DECK': {
          session.deselectDeck(client.playerId);
          break;
        }

        case 'SET_READY': {
          const valid = SetReadySchema.parse(payload);
          session.setReady(client.playerId, valid);
          break;
        }

        case 'START_GAME': {
          StartGameSchema.parse(payload);
          session.initiativeService.onStateChanged = () => this.broadcastRoomState(client.roomCode);
          session.mulliganService.onStateChanged = () => this.broadcastRoomState(client.roomCode);
          session.startGame(client.playerId);
          break;
        }

        case 'ROLL_D20_INITIATIVE': {
          throw new Error(
            'La tirada de iniciativa es 100% automática y gestionada exclusivamente por el servidor. Ningún jugador debe lanzar manualmente.',
          );
        }

        case 'SET_PLAYMAT': {
          const valid = SetPlaymatSchema.parse(payload);
          session.setPlaymat(client.playerId, valid.playmatUrl);
          break;
        }

        default:
          console.warn(`[WS] Tipo de acción no reconocido: ${type}`);
          return;
      }

      // Broadcast updated room state to all clients (inmediato para transiciones de turno y fase)
      const isCriticalTransition = type === 'PASS_TURN' || type === 'START_GAME' || type === 'SET_READY';
      this.broadcastRoomState(client.roomCode, isCriticalTransition);
    } catch (err: any) {
      console.error(`[WS] Error al procesar acción ${type}:`, err);
      client.socket.send(
        JSON.stringify({
          type: 'ACTION_REJECTED',
          error: err.message || 'Error en validación de acción',
        }),
      );
      this.broadcastRoomState(client.roomCode);
    }
  }

  /**
   * Broadcasts tailored state to each client, filtering hidden information
   */
  public broadcastRoomState(roomCode: string, immediateSnapshot: boolean = false): void {
    const clients = this.roomClients.get(roomCode);
    const session = roomManager.getSession(roomCode);
    if (!clients || !session) return;

    // Persistir instantánea duradera en PostgreSQL de manera no bloqueante y agrupada (Punto A4.4)
    this.queueSnapshotSave(roomCode, session.state, immediateSnapshot);

    for (const client of clients) {
      if (client.socket.readyState === WebSocket.OPEN) {
        // Filter out secret cards for this specific receiver
        const filteredState = filterRoomStateForPlayer(
          session.state,
          client.isSpectator ? null : client.playerId,
        );

        client.socket.send(
          JSON.stringify({
            type: 'ROOM_STATE_SYNC',
            roomState: filteredState,
            yourPlayerId: client.playerId,
            timestamp: Date.now(),
          }),
        );
      }
    }
  }

  /**
   * Handles player disconnection
   */
  private handleClientDisconnect(client: ClientConnection): void {
    const clients = this.roomClients.get(client.roomCode);
    if (clients) {
      clients.delete(client);
      if (clients.size === 0) {
        this.roomClients.delete(client.roomCode);
      }
    }

    if (client.clientIp && client.clientIp !== 'unknown') {
      const ipConns = this.ipConnections.get(client.clientIp);
      if (ipConns) {
        ipConns.delete(client);
        if (ipConns.size === 0) {
          this.ipConnections.delete(client.clientIp);
        }
      }
    }

    roomManager.handleDisconnect(client.roomCode, client.playerId);
    console.log(`[WS] ${client.playerName} desconectado de mesa ${client.roomCode}`);

    this.broadcastRoomState(client.roomCode);
  }
}

export const wsHandler = new WebSocketHandler();
