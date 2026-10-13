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
} from '@mtgc/shared';
import { roomManager } from './room-manager.js';
import { filterRoomStateForPlayer } from './visibility-filter.js';

interface ClientConnection {
  socket: WebSocket;
  roomCode: string;
  playerId: string;
  playerName: string;
  isSpectator: boolean;
}

export class WebSocketHandler {
  // roomCode -> Set of ClientConnections
  private roomClients = new Map<string, Set<ClientConnection>>();
  // playerId -> message timestamps in sliding window (REQ-12.4, REQ-16.4)
  private messageRateLimits = new Map<string, number[]>();

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

  /**
   * Registers a new WebSocket connection to a room
   */
  public handleConnection(
    socket: WebSocket,
    roomCode: string,
    playerInfo: { playerId: string; playerName: string; isSpectator?: boolean },
  ): void {
    const code = roomCode.toUpperCase();
    let session = roomManager.getSession(code);

    if (!session) {
      socket.send(
        JSON.stringify({
          type: 'ERROR',
          message: `La mesa "${code}" no existe o ha expirado.`,
        }),
      );
      socket.close();
      return;
    }

    // Join room or reconnect
    const { player } = roomManager.joinRoom(code, playerInfo);

    const client: ClientConnection = {
      socket,
      roomCode: code,
      playerId: player.id,
      playerName: player.name,
      isSpectator: player.isSpectator,
    };

    if (!this.roomClients.has(code)) {
      this.roomClients.set(code, new Set());
    }
    this.roomClients.get(code)!.add(client);

    console.log(`[WS] ${player.name} (${player.id}) conectado a mesa ${code}`);

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
  private handleClientAction(client: ClientConnection, rawMessage: string): void {
    const session = roomManager.getSession(client.roomCode);
    if (!session) return;

    let envelope;
    try {
      const parsedJson = JSON.parse(rawMessage);
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
      envelope = parseResult.data;
    } catch {
      client.socket.send(
        JSON.stringify({
          type: 'ACTION_REJECTED',
          error: 'JSON malformado',
        }),
      );
      return;
    }

    const { type, payload } = envelope;

    // Spectator restriction: spectators can only chat or roll dice
    if (client.isSpectator && type !== 'CHAT_MESSAGE' && type !== 'ROLL_DICE') {
      client.socket.send(
        JSON.stringify({
          type: 'ACTION_REJECTED',
          error: 'Los espectadores solo pueden enviar mensajes o tirar dados.',
        }),
      );
      return;
    }

    try {
      switch (type) {
        case 'ADJUST_LIFE': {
          const valid = AdjustLifeSchema.parse(payload);
          session.adjustLife(valid);
          break;
        }

        case 'SET_LIFE': {
          const valid = SetLifeSchema.parse(payload);
          session.setLife(valid);
          break;
        }

        case 'SET_PLAYER_STATUS': {
          const valid = SetPlayerStatusSchema.parse(payload);
          session.setPlayerStatus(valid);
          break;
        }

        case 'COMMANDER_DAMAGE': {
          const valid = CommanderDamageSchema.parse(payload);
          session.adjustCommanderDamage(valid, client.playerId);
          break;
        }

        case 'SET_PLAYER_COUNTER': {
          const valid = SetPlayerCounterSchema.parse(payload);
          session.setPlayerCounter(valid);
          break;
        }

        case 'SET_CARD_COUNTER': {
          const valid = SetCardCounterSchema.parse(payload);
          session.setCardCounter(client.playerId, valid);
          break;
        }

        case 'DRAW_CARDS': {
          const valid = DrawCardsSchema.parse(payload);
          session.drawCards(client.playerId, valid.count);
          break;
        }

        case 'MULLIGAN': {
          session.mulligan(client.playerId);
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
          session.selectDeck(client.playerId, valid as any);
          break;
        }

        case 'SET_READY': {
          const valid = SetReadySchema.parse(payload);
          session.setReady(client.playerId, valid);
          break;
        }

        default:
          console.warn(`[WS] Tipo de acción no reconocido: ${type}`);
          return;
      }

      // Broadcast updated room state to all clients
      this.broadcastRoomState(client.roomCode);
    } catch (err: any) {
      console.error(`[WS] Error al procesar acción ${type}:`, err);
      client.socket.send(
        JSON.stringify({
          type: 'ACTION_REJECTED',
          error: err.message || 'Error en validación de acción',
        }),
      );
    }
  }

  /**
   * Broadcasts tailored state to each client, filtering hidden information
   */
  public broadcastRoomState(roomCode: string): void {
    const clients = this.roomClients.get(roomCode);
    const session = roomManager.getSession(roomCode);
    if (!clients || !session) return;

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

    roomManager.handleDisconnect(client.roomCode, client.playerId);
    console.log(`[WS] ${client.playerName} desconectado de mesa ${client.roomCode}`);

    this.broadcastRoomState(client.roomCode);
  }
}

export const wsHandler = new WebSocketHandler();
