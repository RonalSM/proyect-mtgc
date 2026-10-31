import { RoomState, PlayerState, PLAYER_PALETTE } from '@mtgc/shared';
import { GameStateSession } from './game-state.js';
import { prisma } from '../db.js';
import { randomBytes } from 'crypto';
import { redisSnapshotService } from '../services/redis-snapshot.service.js';

export class RoomManager {
  private sessions = new Map<string, GameStateSession>(); // roomCode -> GameStateSession
  private disconnectTimers = new Map<string, NodeJS.Timeout>(); // playerId -> Timeout (10 min seat reservation)
  private lastActivityTimestamps = new Map<string, number>(); // roomCode -> timestamp
  public getActiveClientCount?: (code: string) => number;

  /**
   * Generates a unique 6-character uppercase alphanumeric room code
   */
  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid confusing 0/O, 1/I
    let code = '';
    do {
      code = '';
      const bytes = randomBytes(6);
      for (let i = 0; i < 6; i++) {
        code += chars[bytes[i]! % chars.length];
      }
    } while (this.sessions.has(code));
    return code;
  }

  /**
   * Creates a new game room
   */
  public createRoom(input: {
    name: string;
    hostName: string;
    hostId: string;
    maxPlayers?: number;
    startingLife?: number;
    allowSpectators?: boolean;
  }): GameStateSession {
    const code = this.generateRoomCode();
    const roomId = `room_${Date.now()}`;
    const startingLife = input.startingLife ?? 40;
    const maxPlayers = input.maxPlayers ?? 4;

    const hostPlayer: PlayerState = {
      id: input.hostId,
      name: input.hostName,
      color: PLAYER_PALETTE[0]!.hex,
      seatNumber: 0,
      isHost: true,
      isSpectator: false,
      isConnected: true,
      life: startingLife,
      commanderDamage: {},
      counters: {
        poison: 0,
        energy: 0,
        experience: 0,
        commanderTax: 0,
        custom: {},
      },
      isEliminated: false,
      isAtRisk: false,
      deckLoaded: false,
      handCount: 0,
      libraryCount: 0,
      graveyardCount: 0,
      exileCount: 0,
    };

    const initialRoomState: RoomState = {
      id: roomId,
      code,
      name: input.name,
      hostId: input.hostId,
      status: 'lobby',
      settings: {
        startingLife,
        maxPlayers,
        allowSpectators: input.allowSpectators ?? true,
      },
      players: {
        [input.hostId]: hostPlayer,
      },
      playerZones: {
        [input.hostId]: {
          library: [],
          hand: [],
          battlefield: [],
          graveyard: [],
          exile: [],
          command: [],
        },
      },
      turnOrder: [input.hostId],
      activePlayerId: input.hostId,
      turnNumber: 1,
      version: 1,
      logs: [
        {
          id: `log_init_${Date.now()}`,
          timestamp: Date.now(),
          playerId: input.hostId,
          playerName: input.hostName,
          actionText: `creó la mesa "${input.name}" (Código: ${code})`,
          isUndoable: false,
        },
      ],
    };

    const session = new GameStateSession(initialRoomState);
    this.sessions.set(code, session);
    this.lastActivityTimestamps.set(code, Date.now());

    // Save initial snapshot in Redis
    redisSnapshotService.save(code, initialRoomState).catch(() => {});

    // Save to PostgreSQL asynchronously if DB is available
    prisma.table
      .create({
        data: {
          id: roomId,
          code,
          name: input.name,
          status: 'lobby',
          settings: initialRoomState.settings as any,
        },
      })
      .catch(() => {});

    return session;
  }

  /**
   * Retrieves an active session by room code
   */
  public getSession(code: string): GameStateSession | undefined {
    return this.sessions.get(code.toUpperCase());
  }

  /**
   * Adds or reconnects a player to a room
   */
  public joinRoom(
    code: string,
    playerInfo: {
      playerId: string;
      playerName: string;
      isSpectator?: boolean;
    },
  ): { session: GameStateSession; player: PlayerState } {
    const session = this.getSession(code);
    if (!session) {
      throw new Error(`La mesa con código "${code}" no existe.`);
    }

    const { state } = session;

    // Check if player is reconnecting
    if (state.players[playerInfo.playerId]) {
      const existing = state.players[playerInfo.playerId]!;
      existing.isConnected = true;

      // Clear any disconnect cancellation timer
      const timer = this.disconnectTimers.get(playerInfo.playerId);
      if (timer) {
        clearTimeout(timer);
        this.disconnectTimers.delete(playerInfo.playerId);
      }

      session.state.logs.push({
        id: `recon_${Date.now()}`,
        timestamp: Date.now(),
        playerId: playerInfo.playerId,
        playerName: existing.name,
        actionText: 'se ha reconectado a la partida',
        isUndoable: false,
      });
      session.state.version++;

      return { session, player: existing };
    }

    // New participant joining
    if (playerInfo.isSpectator) {
      const spectator: PlayerState = {
        id: playerInfo.playerId,
        name: playerInfo.playerName,
        seatNumber: -1,
        isHost: false,
        isSpectator: true,
        isConnected: true,
        life: 0,
        commanderDamage: {},
        counters: { poison: 0, energy: 0, experience: 0, commanderTax: 0, custom: {} },
        isEliminated: false,
        isAtRisk: false,
        deckLoaded: false,
        handCount: 0,
        libraryCount: 0,
        graveyardCount: 0,
        exileCount: 0,
      };
      state.players[playerInfo.playerId] = spectator;
      state.version++;
      return { session, player: spectator };
    }

    // Check player seat limit (2 to 6)
    const activePlayerCount = Object.values(state.players).filter(p => !p.isSpectator).length;
    if (activePlayerCount >= state.settings.maxPlayers) {
      throw new Error(`La mesa está llena (máximo ${state.settings.maxPlayers} jugadores).`);
    }

    // Find first available seat number
    const occupiedSeats = new Set(
      Object.values(state.players)
        .filter(p => !p.isSpectator)
        .map(p => p.seatNumber),
    );
    let assignedSeat = 0;
    while (occupiedSeats.has(assignedSeat)) {
      assignedSeat++;
    }

    const newPlayer: PlayerState = {
      id: playerInfo.playerId,
      name: playerInfo.playerName,
      color: (PLAYER_PALETTE[assignedSeat % PLAYER_PALETTE.length] || PLAYER_PALETTE[0])!.hex,
      seatNumber: assignedSeat,
      isHost: false,
      isSpectator: false,
      isConnected: true,
      life: state.settings.startingLife,
      commanderDamage: {},
      counters: {
        poison: 0,
        energy: 0,
        experience: 0,
        commanderTax: 0,
        custom: {},
      },
      isEliminated: false,
      isAtRisk: false,
      deckLoaded: false,
      handCount: 0,
      libraryCount: 0,
      graveyardCount: 0,
      exileCount: 0,
    };

    state.players[playerInfo.playerId] = newPlayer;
    state.playerZones[playerInfo.playerId] = {
      library: [],
      hand: [],
      battlefield: [],
      graveyard: [],
      exile: [],
      command: [],
    };
    state.turnOrder.push(playerInfo.playerId);

    session.state.logs.push({
      id: `join_${Date.now()}`,
      timestamp: Date.now(),
      playerId: playerInfo.playerId,
      playerName: playerInfo.playerName,
      actionText: `se unió a la mesa en el asiento #${assignedSeat + 1}`,
      isUndoable: false,
    });
    session.state.version++;
    redisSnapshotService.save(code, session.state).catch(() => {});

    return { session, player: newPlayer };
  }

  /**
   * Handles player disconnection (reserving seat for 10 minutes)
   */
  public handleDisconnect(code: string, playerId: string): void {
    const session = this.getSession(code);
    if (!session) return;

    const player = session.state.players[playerId];
    if (player) {
      player.isConnected = false;
      session.state.version++;

      // Set 10-minute reservation timer before freeing seat if lobby
      const timer = setTimeout(
        () => {
          if (session.state.status === 'lobby') {
            delete session.state.players[playerId];
            delete session.state.playerZones[playerId];
            session.state.turnOrder = session.state.turnOrder.filter(id => id !== playerId);
            session.state.version++;
          }
        },
        10 * 60 * 1000,
      );

      this.disconnectTimers.set(playerId, timer);
    }
  }

  /**
   * Closes and removes a room
   */
  public closeRoom(code: string): boolean {
    const session = this.getSession(code);
    if (!session) return false;

    redisSnapshotService.delete(code).catch(() => {});

    prisma.table
      .update({
        where: { code: code.toUpperCase() },
        data: { status: 'finished', endedAt: new Date() },
      })
      .catch(() => {});

    this.sessions.delete(code.toUpperCase());
    this.lastActivityTimestamps.delete(code.toUpperCase());
    return true;
  }

  /**
   * Registra actividad reciente en una sala
   */
  public recordActivity(roomCode: string): void {
    this.lastActivityTimestamps.set(roomCode.toUpperCase(), Date.now());
  }

  /**
   * Purgado automático de salas inactivas o huérfanas sin sockets conectados (Punto A2.2 / Corrección Bloqueante)
   */
  public pruneInactiveRooms(maxInactiveMs: number = 15 * 60 * 1000): number {
    const now = Date.now();
    let pruned = 0;
    for (const [code, session] of Array.from(this.sessions.entries())) {
      if (session.state.status === 'finished') {
        this.closeRoom(code);
        pruned++;
        continue;
      }
      const clientCount = this.getActiveClientCount ? this.getActiveClientCount(code) : 0;
      const lastActivity = this.lastActivityTimestamps.get(code) || 0;
      const isTestRoom = code.startsWith('TEST') || session.state.name?.startsWith('Mesa Concurrente');

      if (clientCount === 0) {
        if (isTestRoom || now - lastActivity > maxInactiveMs) {
          this.closeRoom(code);
          pruned++;
        }
      }
    }
    return pruned;
  }

  /**
   * Restores active room sessions from Redis snapshots
   */
  public async restoreFromSnapshots(): Promise<number> {
    const restoredRooms = await redisSnapshotService.restoreAllActiveRooms();
    let restoredCount = 0;
    for (const [code, state] of restoredRooms.entries()) {
      if (code.startsWith('TEST') || state.status === 'finished') {
        continue;
      }
      if (!this.sessions.has(code)) {
        this.sessions.set(code, new GameStateSession(state));
        this.lastActivityTimestamps.set(code, Date.now());
        restoredCount++;
      }
    }
    return restoredCount;
  }

  /**
   * Returns count of active rooms in memory
   */
  public getActiveRoomsCount(): number {
    return this.sessions.size;
  }

  /**
   * Kicks a player from the room (REQ-13.2). Only host can kick.
   */
  public kickPlayer(
    roomCode: string,
    hostPlayerId: string,
    payload: { seat?: number; playerId?: string; reason?: string },
  ): { kickedPlayerId: string; kickedPlayerName: string } {
    const session = this.getSession(roomCode);
    if (!session) {
      throw new Error('Sala no encontrada.');
    }

    const host = session.state.players[hostPlayerId];
    if (!host || !host.isHost) {
      throw new Error('Solo el anfitrión puede expulsar jugadores.');
    }

    let targetPlayer: PlayerState | undefined;
    if (payload.playerId) {
      targetPlayer = session.state.players[payload.playerId];
    } else if (payload.seat !== undefined) {
      targetPlayer = Object.values(session.state.players).find(p => p.seatNumber === payload.seat);
    }

    if (!targetPlayer) {
      throw new Error('Jugador a expulsar no encontrado.');
    }

    if (targetPlayer.id === hostPlayerId) {
      throw new Error('El anfitrión no puede expulsarse a sí mismo.');
    }

    const targetId = targetPlayer.id;
    const targetName = targetPlayer.name;

    const timer = this.disconnectTimers.get(targetId);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(targetId);
    }

    delete session.state.players[targetId];
    delete session.state.playerZones[targetId];
    session.state.turnOrder = session.state.turnOrder.filter(id => id !== targetId);

    session.addLog(
      hostPlayerId,
      `expulsó a "${targetName}" de la mesa${payload.reason ? `: ${payload.reason}` : ''}`,
    );
    session.incrementVersion();

    return { kickedPlayerId: targetId, kickedPlayerName: targetName };
  }

  /**
   * Transfers the host role to another seated player (REQ-13.3).
   */
  public transferHost(
    roomCode: string,
    currentHostPlayerId: string,
    payload: { newHostSeat?: number; newHostId?: string },
  ): { newHostId: string; newHostName: string } {
    const session = this.getSession(roomCode);
    if (!session) {
      throw new Error('Sala no encontrada.');
    }

    const currentHost = session.state.players[currentHostPlayerId];
    if (!currentHost || !currentHost.isHost) {
      throw new Error('Solo el anfitrión actual puede transferir el rol de anfitrión.');
    }

    let targetPlayer: PlayerState | undefined;
    if (payload.newHostId) {
      targetPlayer = session.state.players[payload.newHostId];
    } else if (payload.newHostSeat !== undefined) {
      targetPlayer = Object.values(session.state.players).find(
        p => p.seatNumber === payload.newHostSeat,
      );
    }

    if (!targetPlayer) {
      throw new Error('Nuevo anfitrión no encontrado.');
    }

    if (targetPlayer.isSpectator) {
      throw new Error('No se puede transferir el rol de anfitrión a un espectador.');
    }

    if (targetPlayer.id === currentHostPlayerId) {
      return { newHostId: currentHost.id, newHostName: currentHost.name };
    }

    currentHost.isHost = false;
    targetPlayer.isHost = true;
    session.state.hostId = targetPlayer.id;

    session.addLog(currentHostPlayerId, `transfirió el rol de anfitrión a "${targetPlayer.name}"`);
    session.incrementVersion();

    return { newHostId: targetPlayer.id, newHostName: targetPlayer.name };
  }

  /**
   * Updates room settings such as turn timer and spectator permission.
   */
  public updateRoomSettings(
    roomCode: string,
    hostPlayerId: string,
    payload: { turnTimerSeconds?: number; allowSpectators?: boolean },
  ): void {
    const session = this.getSession(roomCode);
    if (!session) {
      throw new Error('Sala no encontrada.');
    }

    const host = session.state.players[hostPlayerId];
    if (!host || !host.isHost) {
      throw new Error('Solo el anfitrión puede actualizar los ajustes de la mesa.');
    }

    if (payload.turnTimerSeconds !== undefined) {
      session.state.settings.turnTimerSeconds = payload.turnTimerSeconds;
    }
    if (payload.allowSpectators !== undefined) {
      session.state.settings.allowSpectators = payload.allowSpectators;
    }

    session.addLog(hostPlayerId, 'actualizó los ajustes de la mesa');
    session.incrementVersion();
  }

  /**
   * Returns count of all players in active rooms
   */
  public getActivePlayersCount(): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      count += Object.keys(session.state.players).length;
    }
    return count;
  }
}

export const roomManager = new RoomManager();
