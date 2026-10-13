import { secureRoll } from './csprng.js';
import type { GameStateSession } from './game-state.js';

export class InitiativeService {
  private session: GameStateSession;
  private timeoutTimer: NodeJS.Timeout | null = null;
  private roundRollsHistory = new Map<number, Record<string, number>>();
  // Callback when state transitions or completes (e.g., to broadcast over WS)
  public onStateChanged?: () => void;

  constructor(session: GameStateSession) {
    this.session = session;
  }

  /**
   * Starts or resets the 15-second initiative timer (REQ-21.4)
   */
  public startInitiativeTimer(): void {
    this.clearTimer();
    this.timeoutTimer = setTimeout(() => {
      this.resolveCurrentRoundWithAutoRolls();
    }, 15000);
  }

  public clearTimer(): void {
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
  }

  /**
   * Rolls a D20 for initiative on the server (REQ-21.2 / crypto.randomInt)
   */
  public rollD20(playerId: string): number {
    const state = this.session.state;
    if (state.status !== 'initiative' || !state.initiative) {
      throw new Error('La mesa no está en fase de iniciativa.');
    }

    const player = state.players[playerId];
    if (!player || player.isSpectator) {
      throw new Error('Solo los jugadores participantes pueden tirar iniciativa.');
    }

    const initiative = state.initiative;
    if (initiative.activeTiedPlayerIds && !initiative.activeTiedPlayerIds.includes(playerId)) {
      throw new Error('No estás involucrado en esta ronda de desempate.');
    }

    // If player already rolled in current round, return their roll
    if (initiative.rolls[playerId] !== undefined) {
      return initiative.rolls[playerId]!;
    }

    // Cryptographically secure roll between 1 and 20 (REQ-21.2)
    const roll = secureRoll(20);
    initiative.rolls[playerId] = roll;
    player.initiativeRoll = roll;

    this.session.addLog(playerId, `tiró un D20 de iniciativa: 🎲 ${roll}`);
    this.session.incrementVersion();

    // Check if all players in current pool have rolled
    const pool =
      initiative.activeTiedPlayerIds ??
      Object.keys(state.players).filter(id => !state.players[id]?.isSpectator);

    const allRolled = pool.every(id => initiative.rolls[id] !== undefined);
    if (allRolled) {
      this.resolveRound();
    }

    if (this.onStateChanged) {
      this.onStateChanged();
    }

    return roll;
  }

  /**
   * Resolves unrolled players automatically after 15s timeout or disconnection (REQ-21.4)
   */
  public resolveCurrentRoundWithAutoRolls(): void {
    const state = this.session.state;
    if (state.status !== 'initiative' || !state.initiative) return;

    const initiative = state.initiative;
    const seatedPlayerIds = Object.keys(state.players).filter(
      id => !state.players[id]?.isSpectator,
    );
    const pool = initiative.activeTiedPlayerIds ?? seatedPlayerIds;

    for (const pid of pool) {
      if (initiative.rolls[pid] === undefined) {
        const auto = secureRoll(20);
        initiative.rolls[pid] = auto;
        if (state.players[pid]) {
          state.players[pid]!.initiativeRoll = auto;
        }
        this.session.addLog(
          pid,
          `(Tiempo de 15s expirado) Servidor tiró D20 automático: 🎲 ${auto}`,
        );
      }
    }

    this.resolveRound();

    if (this.onStateChanged) {
      this.onStateChanged();
    }
  }

  /**
   * Resolves round rolls, handles ties up to 5 rounds, and finalizes turn order (REQ-21.5, REQ-21.6)
   */
  public resolveRound(): void {
    const state = this.session.state;
    if (state.status !== 'initiative' || !state.initiative) return;

    this.clearTimer();
    const initiative = state.initiative;
    const seatedPlayerIds = Object.keys(state.players).filter(
      id => !state.players[id]?.isSpectator,
    );

    // Group current pool by roll value descending
    const currentPool = initiative.activeTiedPlayerIds ?? seatedPlayerIds;
    const rollsMap = new Map<string, number>();
    for (const pid of currentPool) {
      rollsMap.set(pid, initiative.rolls[pid] ?? 1);
    }

    const groups = new Map<number, string[]>();
    for (const pid of currentPool) {
      const val = rollsMap.get(pid)!;
      groups.set(val, [...(groups.get(val) ?? []), pid]);
    }

    // Record current round rolls into history
    const currentRound = initiative.round;
    const currentRoundRolls: Record<string, number> = {};
    for (const pid of currentPool) {
      currentRoundRolls[pid] = initiative.rolls[pid] ?? state.players[pid]?.initiativeRoll ?? 1;
    }
    this.roundRollsHistory.set(currentRound, currentRoundRolls);

    const sortedVals = [...groups.keys()].sort((a, b) => b - a);
    const tiedPlayerIds: string[] = [];
    for (const val of sortedVals) {
      const g = groups.get(val)!;
      if (g.length > 1) {
        tiedPlayerIds.push(...g);
      }
    }

    // Check if any tie exists in this round and we haven't reached 5 rounds (REQ-21.6)
    if (tiedPlayerIds.length > 0 && initiative.round < 5) {
      initiative.round++;
      initiative.activeTiedPlayerIds = tiedPlayerIds;
      initiative.rolls = {};
      initiative.deadlineTimestamp = Date.now() + 15000;

      const tiedNames = tiedPlayerIds.map(id => state.players[id]?.name || id).join(', ');
      this.session.addLog(
        state.hostId,
        `¡Empate en iniciativa! Se abre la ronda ${initiative.round} de desempate para: ${tiedNames}`,
      );
      this.session.incrementVersion();
      this.startInitiativeTimer();
      return;
    }

    // All ties resolved or round >= 5: Determine final turn order
    // Order all seated players hierarchically by round-by-round rolls (REQ-21.5, REQ-21.6)
    const finalOrder = [...seatedPlayerIds].sort((a, b) => {
      for (let r = 1; r <= initiative.round; r++) {
        const rollsForR = this.roundRollsHistory.get(r);
        const rollA =
          rollsForR?.[a] ?? (r === initiative.round ? state.players[a]?.initiativeRoll : undefined);
        const rollB =
          rollsForR?.[b] ?? (r === initiative.round ? state.players[b]?.initiativeRoll : undefined);

        if (rollA !== undefined && rollB !== undefined && rollB !== rollA) {
          return rollB - rollA; // Mayor tirada en la ronda r juega primero
        }
      }

      // Desempate persistente tras 5 rondas: por número de asiento ascendente (REQ-21.6)
      const seatA = state.players[a]?.seatNumber ?? 0;
      const seatB = state.players[b]?.seatNumber ?? 0;
      return seatA - seatB;
    });

    state.turnOrder = finalOrder;
    state.status = 'playing';
    state.activePlayerId = finalOrder[0] ?? null;
    state.turnNumber = 1;

    finalOrder.forEach((pid, index) => {
      const p = state.players[pid];
      if (p) {
        p.initiativeOrder = index + 1; // 1.º, 2.º, etc. (REQ-21.7)
      }
    });

    initiative.resolvedOrder = finalOrder;

    const orderSummary = finalOrder
      .map((pid, idx) => `${idx + 1}.º ${state.players[pid]?.name || pid}`)
      .join(', ');

    this.session.addLog(
      state.hostId,
      `Iniciativa resuelta. Orden de turnos: ${orderSummary}`,
    );
    this.session.incrementVersion();
  }

  public cleanup(): void {
    this.clearTimer();
  }
}
