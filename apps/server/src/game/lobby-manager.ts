import {
  CardDefinition,
  PlayerSelectedDeck,
  RoomState,
  SelectDeckPayload,
} from '@mtgc/shared';

export interface PendingPlayerDeck {
  deckId?: string;
  name: string;
  commanderName: string;
  commanderImageUrl?: string;
  commanderCards: CardDefinition[];
  maindeckCards: CardDefinition[];
  warnings?: string[];
}

export class LobbyManager {
  private roomState: RoomState;
  // Private storage for full card lists (REQ-20.9: card list secrecy from other players)
  private pendingDecks = new Map<string, PendingPlayerDeck>();

  constructor(roomState: RoomState) {
    this.roomState = roomState;
  }

  /**
   * Gets the private deck stored for a player (used by GameStarter)
   */
  public getPendingDeck(playerId: string): PendingPlayerDeck | undefined {
    return this.pendingDecks.get(playerId);
  }

  /**
   * Selects a deck for a player.
   * Keeps full card definitions private and exposes only public metadata (REQ-20.2, REQ-20.9).
   */
  public selectDeck(playerId: string, payload: SelectDeckPayload): PlayerSelectedDeck {
    const player = this.roomState.players[playerId];
    if (!player) {
      throw new Error('Jugador no encontrado en la sala.');
    }
    if (player.isSpectator) {
      throw new Error('Los espectadores no pueden seleccionar mazos.');
    }
    if (this.roomState.status !== 'lobby') {
      throw new Error('No se pueden seleccionar mazos una vez iniciada la partida.');
    }

    // Store full card definitions privately on server
    this.pendingDecks.set(playerId, {
      deckId: payload.deckId,
      name: payload.deckName,
      commanderName: payload.commanderName,
      commanderImageUrl: payload.commanderImageUrl,
      commanderCards: payload.commanderCards,
      maindeckCards: payload.maindeckCards,
      warnings: payload.warnings,
    });

    // Public metadata (only deck name and commander)
    const publicSelectedDeck: PlayerSelectedDeck = {
      id: payload.deckId,
      name: payload.deckName,
      commanderName: payload.commanderName,
      commanderImageUrl: payload.commanderImageUrl,
      cardCount: (payload.commanderCards.length || 0) + (payload.maindeckCards.length || 0),
      warnings: payload.warnings,
    };

    player.selectedDeck = publicSelectedDeck;
    player.deckLoaded = true;

    // Default playmat to commander art if available and not custom set
    if (payload.commanderImageUrl && !player.playmatUrl) {
      player.playmatUrl = payload.commanderImageUrl;
    }

    return publicSelectedDeck;
  }

  /**
   * Toggles player Ready status (REQ-20.8).
   * Only allowed if a deck is selected.
   */
  public setReady(playerId: string, isReady: boolean): boolean {
    const player = this.roomState.players[playerId];
    if (!player) {
      throw new Error('Jugador no encontrado en la sala.');
    }
    if (player.isSpectator) {
      throw new Error('Los espectadores no participan en el estado Listo.');
    }
    if (this.roomState.status !== 'lobby') {
      throw new Error('No se puede modificar el estado Listo fuera de la sala de espera.');
    }

    if (isReady && !player.selectedDeck) {
      throw new Error('Debes seleccionar un mazo antes de marcarte como Listo.');
    }

    player.isReady = isReady;
    return isReady;
  }

  /**
   * Verifies if the host can start the game (REQ-20.10).
   * Requires host caller, >= 2 seated players, and all seated players ready.
   */
  public canStartGame(hostPlayerId: string): { canStart: boolean; reason?: string } {
    const host = this.roomState.players[hostPlayerId];
    if (!host || !host.isHost) {
      return { canStart: false, reason: 'Solo el anfitrión puede iniciar la partida.' };
    }

    if (this.roomState.status !== 'lobby') {
      return { canStart: false, reason: 'La partida ya ha iniciado.' };
    }

    const seatedPlayers = Object.values(this.roomState.players).filter(p => !p.isSpectator);
    if (seatedPlayers.length < 2) {
      return { canStart: false, reason: 'Se necesitan al menos 2 jugadores para iniciar la partida.' };
    }

    const unreadyPlayers = seatedPlayers.filter(p => !p.isReady || !p.selectedDeck);
    if (unreadyPlayers.length > 0) {
      const names = unreadyPlayers.map(p => p.name).join(', ');
      return {
        canStart: false,
        reason: `Todos los jugadores deben estar Listos. Pendientes: ${names}`,
      };
    }

    return { canStart: true };
  }

  /**
   * Cleans up player deck when leaving room or kicked
   */
  public removePlayer(playerId: string): void {
    this.pendingDecks.delete(playerId);
  }
}
