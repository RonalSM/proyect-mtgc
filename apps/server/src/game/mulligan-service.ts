import { secureShuffle } from './csprng.js';
import type { GameStateSession } from './game-state.js';

export class MulliganService {
  private session: GameStateSession;
  public onStateChanged?: () => void;

  constructor(session: GameStateSession) {
    this.session = session;
  }

  /**
   * Starts the London Mulligan phase (Punto 5):
   * Sets room status to 'mulligan', establishes sequential decision order
   * based on turnOrder, deals hidden 7-card opening hands, and prompts the first player.
   */
  public startMulliganPhase(): void {
    const state = this.session.state;
    state.status = 'mulligan';

    const seatedPlayerIds = Object.keys(state.players).filter(
      id => !state.players[id]?.isSpectator,
    );
    const order = state.turnOrder && state.turnOrder.length > 0 ? state.turnOrder : seatedPlayerIds;

    state.mulligan = {
      currentDecidingPlayerId: order[0] ?? null,
      players: {},
    };

    for (const pid of seatedPlayerIds) {
      const zones = state.playerZones[pid];
      if (zones) {
        // Barajar biblioteca con CSPRNG
        zones.library = secureShuffle(zones.library);

        // Si la mano no tiene cartas (o no se repartió), robar 7 cartas iniciales
        if (zones.hand.length === 0) {
          const drawCount = Math.min(7, zones.library.length);
          zones.hand = zones.library.splice(0, drawCount);
        }
      }

      state.mulligan.players[pid] = {
        playerId: pid,
        mulliganCount: 0,
        hasKept: false,
        cardsToBottomCount: 0,
      };

      this.session.syncPlayerCounts(pid);
    }

    const firstPlayerName = order[0] ? state.players[order[0]]?.name || 'Primer jugador' : 'Primer jugador';
    this.session.addLog(
      state.hostId,
      `Inició la fase de mulligan (Regla de Londres con 1.º gratis). Turno de decisión: ${firstPlayerName}.`,
    );

    this.session.incrementVersion();
    if (this.onStateChanged) {
      this.onStateChanged();
    }
  }

  /**
   * Takes a mulligan according to Commander London rules:
   * 1st mulligan is FREE (draws 7, returns 0).
   * For subsequent mulligans (k >= 2), draws 7 and must put k-1 cards on the bottom of the library when keeping.
   */
  public takeMulligan(playerId: string): void {
    const state = this.session.state;
    if (state.status !== 'mulligan' || !state.mulligan) {
      throw new Error('La mesa no está en fase de mulligan.');
    }

    if (state.mulligan.currentDecidingPlayerId !== playerId) {
      const currentName = state.mulligan.currentDecidingPlayerId
        ? state.players[state.mulligan.currentDecidingPlayerId]?.name || 'otro jugador'
        : 'otro jugador';
      throw new Error(`No es tu turno de decidir. Es el turno de ${currentName}.`);
    }

    const pMulligan = state.mulligan.players[playerId];
    if (!pMulligan) {
      throw new Error('Estado de mulligan no encontrado para el jugador.');
    }

    if (pMulligan.hasKept) {
      throw new Error('Ya has decidido quedarte con tu mano.');
    }

    if (pMulligan.cardsToBottomCount >= 7) {
      throw new Error('La mano resultante sería 0 cartas. Solo queda quedarse con la mano.');
    }

    const zones = state.playerZones[playerId];
    if (!zones) {
      throw new Error('Zonas de jugador no encontradas.');
    }

    // Return hand to library and shuffle with CSPRNG
    zones.library.push(...zones.hand);
    zones.hand = [];
    zones.library = secureShuffle(zones.library);

    // Draw 7 cards
    const drawCount = Math.min(7, zones.library.length);
    zones.hand = zones.library.splice(0, drawCount);

    pMulligan.mulliganCount++;
    const k = pMulligan.mulliganCount;

    // Regla de Londres con mulligan gratis de Commander:
    // k = 1: gratis (devuelve 0)
    // k >= 2: devuelve k - 1 al fondo al quedarse
    pMulligan.cardsToBottomCount = k >= 2 ? k - 1 : 0;

    const logText =
      k === 1
        ? 'tomó su 1.er mulligan (gratis de Commander: roba 7 cartas y devuelve 0)'
        : `tomó su mulligan #${k} (roba 7 cartas; si decide quedarse deberá devolver ${k - 1} carta(s) al fondo)`;

    this.session.addLog(playerId, logText);
    this.session.syncPlayerCounts(playerId);
    this.session.incrementVersion();

    if (this.onStateChanged) {
      this.onStateChanged();
    }
  }

  /**
   * Keeps current hand. If k >= 2, puts k-1 chosen cards on the bottom of the library.
   */
  public keepHand(playerId: string, bottomCardIds?: string[]): void {
    const state = this.session.state;
    if (state.status !== 'mulligan' || !state.mulligan) {
      throw new Error('La mesa no está en fase de mulligan.');
    }

    if (state.mulligan.currentDecidingPlayerId !== playerId) {
      const currentName = state.mulligan.currentDecidingPlayerId
        ? state.players[state.mulligan.currentDecidingPlayerId]?.name || 'otro jugador'
        : 'otro jugador';
      throw new Error(`No es tu turno de decidir. Es el turno de ${currentName}.`);
    }

    const pMulligan = state.mulligan.players[playerId];
    if (!pMulligan) {
      throw new Error('Estado de mulligan no encontrado para el jugador.');
    }

    if (pMulligan.hasKept) {
      throw new Error('Ya has decidido quedarte con tu mano.');
    }

    const zones = state.playerZones[playerId];
    if (!zones) {
      throw new Error('Zonas de jugador no encontradas.');
    }

    const requiredBottom = pMulligan.cardsToBottomCount;
    if (requiredBottom > 0) {
      if (!bottomCardIds || bottomCardIds.length !== requiredBottom) {
        throw new Error(
          `Debes seleccionar exactamente ${requiredBottom} carta(s) para poner en el fondo de la biblioteca.`,
        );
      }

      // Verify all specified cards exist in hand
      for (const cardId of bottomCardIds) {
        const found = zones.hand.some(c => c.instanceId === cardId);
        if (!found) {
          throw new Error('Una o más cartas seleccionadas para el fondo no están en tu mano.');
        }
      }

      // Move specified cards from hand to bottom of library (push to library)
      for (const cardId of bottomCardIds) {
        const idx = zones.hand.findIndex(c => c.instanceId === cardId);
        if (idx !== -1) {
          const [card] = zones.hand.splice(idx, 1);
          if (card) {
            zones.library.push(card);
          }
        }
      }

      pMulligan.cardsPutToBottom = [...bottomCardIds];
    }

    pMulligan.hasKept = true;

    this.session.addLog(
      playerId,
      `se quedó con su mano inicial${
        requiredBottom > 0 ? ` (puso ${requiredBottom} carta(s) en el fondo de la biblioteca)` : ''
      }`,
    );

    this.session.syncPlayerCounts(playerId);
    this.advanceDecisionOrder();
  }

  /**
   * Allows the host to skip / force decision for a disconnected player.
   */
  public forceDecision(hostPlayerId: string, targetPlayerId: string): void {
    const state = this.session.state;
    if (state.status !== 'mulligan' || !state.mulligan) {
      throw new Error('La mesa no está en fase de mulligan.');
    }

    const hostPlayer = state.players[hostPlayerId];
    if (!hostPlayer || (!hostPlayer.isHost && state.hostId !== hostPlayerId)) {
      throw new Error('Solo el anfitrión puede forzar la decisión de mano inicial.');
    }

    if (state.mulligan.currentDecidingPlayerId !== targetPlayerId) {
      throw new Error('El jugador objetivo no es el que está en turno de decisión.');
    }

    const pMulligan = state.mulligan.players[targetPlayerId];
    if (!pMulligan) {
      throw new Error('Estado de mulligan no encontrado para el jugador objetivo.');
    }

    const zones = state.playerZones[targetPlayerId];
    if (!zones) {
      throw new Error('Zonas de jugador no encontradas.');
    }

    const requiredBottom = pMulligan.cardsToBottomCount;
    if (requiredBottom > 0) {
      // Pick first N cards from hand to put to bottom
      const toBottom = zones.hand.slice(0, requiredBottom);
      for (const c of toBottom) {
        const idx = zones.hand.findIndex(card => card.instanceId === c.instanceId);
        if (idx !== -1) {
          const [card] = zones.hand.splice(idx, 1);
          if (card) {
            zones.library.push(card);
          }
        }
      }
      pMulligan.cardsPutToBottom = toBottom.map(c => c.instanceId);
    }

    pMulligan.hasKept = true;
    const targetName = state.players[targetPlayerId]?.name || targetPlayerId;

    this.session.addLog(
      hostPlayerId,
      `Anfitrión forzó la decisión de mano inicial de ${targetName} (jugador desconectado o ausente).`,
    );

    this.session.syncPlayerCounts(targetPlayerId);
    this.advanceDecisionOrder();
  }

  /**
   * Advances currentDecidingPlayerId to next player in turnOrder, or completes mulligan phase.
   */
  private advanceDecisionOrder(): void {
    const state = this.session.state;
    if (!state.mulligan) return;

    const order = state.turnOrder;
    const nextPlayerId = order.find(pid => {
      const p = state.mulligan?.players[pid];
      return p && !p.hasKept;
    });

    if (nextPlayerId) {
      state.mulligan.currentDecidingPlayerId = nextPlayerId;
      const nextName = state.players[nextPlayerId]?.name || nextPlayerId;
      this.session.addLog(
        state.hostId,
        `Turno de decisión de mano inicial: ${nextName}.`,
      );
      this.session.incrementVersion();
      if (this.onStateChanged) {
        this.onStateChanged();
      }
    } else {
      // Todos los jugadores han decidido: pasar a estado 'playing'
      state.status = 'playing';
      state.mulligan.currentDecidingPlayerId = null;
      state.activePlayerId = state.turnOrder[0] || null;
      state.turnNumber = 1;

      const firstPlayerName = state.turnOrder[0]
        ? state.players[state.turnOrder[0]]?.name || 'Primer jugador'
        : 'Primer jugador';

      this.session.addLog(
        state.hostId,
        `¡Fase de mulligan completada! La partida comienza. Turno de ${firstPlayerName}.`,
      );

      this.session.incrementVersion();
      if (this.onStateChanged) {
        this.onStateChanged();
      }
    }
  }
}
