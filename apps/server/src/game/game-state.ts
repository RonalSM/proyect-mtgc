import {
  RoomState,
  CardDefinition,
  GameLogEntry,
  AdjustLifePayload,
  CommanderDamagePayload,
  SetPlayerCounterPayload,
  SetCardCounterPayload,
  MoveCardPayload,
  TapCardPayload,
  FlipCardPayload,
} from '@mtgc/shared';
import { secureShuffle, secureRoll } from './csprng.js';
import { randomUUID } from 'crypto';

interface UndoRecord {
  playerId: string;
  revert: () => void;
  description: string;
}

export class GameStateSession {
  public state: RoomState;
  private undoStack: UndoRecord[] = [];

  constructor(initialState: RoomState) {
    this.state = initialState;
  }

  private incrementVersion() {
    this.state.version++;
  }

  private addLog(playerId: string, actionText: string, isUndoable = false): GameLogEntry {
    const player = this.state.players[playerId];
    const logEntry: GameLogEntry = {
      id: randomUUID(),
      timestamp: Date.now(),
      playerId,
      playerName: player?.name || 'Jugador',
      actionText,
      isUndoable,
    };
    this.state.logs.push(logEntry);
    // Keep max 200 logs
    if (this.state.logs.length > 200) {
      this.state.logs.shift();
    }
    return logEntry;
  }

  private syncPlayerCounts(playerId: string) {
    const player = this.state.players[playerId];
    const zones = this.state.playerZones[playerId];
    if (player && zones) {
      player.handCount = zones.hand.length;
      player.libraryCount = zones.library.length;
      player.graveyardCount = zones.graveyard.length;
      player.exileCount = zones.exile.length;
    }
  }

  /**
   * Adjusts life total and checks defeat condition (life <= 0)
   */
  public adjustLife(payload: AdjustLifePayload): void {
    const player = this.state.players[payload.playerId];
    if (!player) return;

    const previousLife = player.life;
    player.life += payload.delta;

    if (player.life <= 0 && !player.isEliminated) {
      player.isEliminated = true;
      player.eliminationReason = 'life';
      this.addLog(payload.playerId, `ha sido derrotado por llegar a 0 vidas`);
    }

    const sign = payload.delta > 0 ? `+${payload.delta}` : `${payload.delta}`;
    this.addLog(payload.playerId, `modificó su vida en ${sign} (Total: ${player.life})`, true);

    this.undoStack.push({
      playerId: payload.playerId,
      description: `Revertir cambio de vida ${sign}`,
      revert: () => {
        player.life = previousLife;
        if (player.life > 0 && player.eliminationReason === 'life') {
          player.isEliminated = false;
          player.eliminationReason = undefined;
        }
      },
    });

    this.incrementVersion();
  }

  /**
   * Records commander combat damage and checks 21 damage rule
   */
  public adjustCommanderDamage(payload: CommanderDamagePayload): void {
    const target = this.state.players[payload.targetPlayerId];
    if (!target) return;

    const current = target.commanderDamage[payload.sourceCommanderInstanceId] ?? 0;
    const previous = current;
    const newDamage = Math.max(0, current + payload.delta);
    target.commanderDamage[payload.sourceCommanderInstanceId] = newDamage;

    if (newDamage >= 21 && !target.isEliminated) {
      target.isEliminated = true;
      target.eliminationReason = 'commander_damage';
      this.addLog(
        payload.targetPlayerId,
        `ha sido derrotado por recibir 21 o más daño de comandante`,
      );
    }

    const sign = payload.delta > 0 ? `+${payload.delta}` : `${payload.delta}`;
    this.addLog(
      payload.targetPlayerId,
      `recibió ${sign} daño de comandante (Total: ${newDamage})`,
      true,
    );

    this.undoStack.push({
      playerId: payload.targetPlayerId,
      description: `Revertir daño de comandante`,
      revert: () => {
        target.commanderDamage[payload.sourceCommanderInstanceId] = previous;
        if (previous < 21 && target.eliminationReason === 'commander_damage') {
          target.isEliminated = false;
          target.eliminationReason = undefined;
        }
      },
    });

    this.incrementVersion();
  }

  /**
   * Modifies player counters (poison, energy, experience, commander tax)
   */
  public setPlayerCounter(payload: SetPlayerCounterPayload): void {
    const player = this.state.players[payload.playerId];
    if (!player) return;

    const cType = payload.counterType as keyof typeof player.counters;
    if (cType === 'poison') {
      const prev = player.counters.poison;
      player.counters.poison = Math.max(0, player.counters.poison + payload.delta);
      if (player.counters.poison >= 10 && !player.isEliminated) {
        player.isEliminated = true;
        player.eliminationReason = 'poison';
        this.addLog(payload.playerId, `ha sido derrotado por acumular 10 contadores de veneno`);
      }
      this.undoStack.push({
        playerId: payload.playerId,
        description: 'Revertir veneno',
        revert: () => {
          player.counters.poison = prev;
          if (prev < 10 && player.eliminationReason === 'poison') {
            player.isEliminated = false;
            player.eliminationReason = undefined;
          }
        },
      });
    } else if (cType === 'energy' || cType === 'experience' || cType === 'commanderTax') {
      const prev = player.counters[cType];
      player.counters[cType] = Math.max(0, player.counters[cType] + payload.delta);
      this.undoStack.push({
        playerId: payload.playerId,
        description: `Revertir contador ${cType}`,
        revert: () => {
          player.counters[cType] = prev;
        },
      });
    }

    const sign = payload.delta > 0 ? `+${payload.delta}` : `${payload.delta}`;
    this.addLog(
      payload.playerId,
      `modificó sus contadores de ${payload.counterType} en ${sign}`,
      true,
    );
    this.incrementVersion();
  }

  /**
   * Loads a full Commander deck into the player's zones
   */
  public loadDeck(
    playerId: string,
    commanderCards: CardDefinition[],
    maindeckCards: CardDefinition[],
  ): void {
    const player = this.state.players[playerId];
    let zones = this.state.playerZones[playerId];
    if (!player) return;

    if (!zones) {
      zones = {
        library: [],
        hand: [],
        battlefield: [],
        graveyard: [],
        exile: [],
        command: [],
      };
      this.state.playerZones[playerId] = zones;
    }

    // Reset zones
    zones.command = [];
    zones.library = [];
    zones.hand = [];
    zones.battlefield = [];
    zones.graveyard = [];
    zones.exile = [];

    // 1. Setup Commander in Command Zone
    for (const cmd of commanderCards) {
      zones.command.push({
        instanceId: randomUUID(),
        definition: cmd,
        ownerId: playerId,
        controllerId: playerId,
        isCommander: true,
        isTapped: false,
        isFaceDown: false,
        rotation: 0,
        counters: {},
      });
    }

    // 2. Setup Maindeck in Library
    for (const card of maindeckCards) {
      zones.library.push({
        instanceId: randomUUID(),
        definition: card,
        ownerId: playerId,
        controllerId: playerId,
        isCommander: false,
        isTapped: false,
        isFaceDown: false,
        rotation: 0,
        counters: {},
      });
    }

    // 3. Secure CSPRNG Shuffle
    zones.library = secureShuffle(zones.library);

    // 4. Draw opening 7 cards
    const initialHandSize = Math.min(7, zones.library.length);
    const drawn = zones.library.splice(0, initialHandSize);
    zones.hand.push(...drawn);

    player.deckLoaded = true;
    player.name = commanderCards[0]?.name || player.name;
    this.syncPlayerCounts(playerId);

    this.addLog(playerId, `cargó su mazo y robó su mano inicial de 7 cartas`);
    this.incrementVersion();
  }

  /**
   * Draws cards from library to hand
   */
  public drawCards(playerId: string, count: number): void {
    const zones = this.state.playerZones[playerId];
    if (!zones || zones.library.length === 0) return;

    const actualCount = Math.min(count, zones.library.length);
    const drawn = zones.library.splice(0, actualCount);
    zones.hand.push(...drawn);

    this.syncPlayerCounts(playerId);
    this.addLog(playerId, `robó ${actualCount} carta(s)`, true);

    this.undoStack.push({
      playerId,
      description: `Revertir robo de ${actualCount} carta(s)`,
      revert: () => {
        const returned = zones.hand.splice(zones.hand.length - actualCount, actualCount);
        zones.library.unshift(...returned);
        this.syncPlayerCounts(playerId);
      },
    });

    this.incrementVersion();
  }

  /**
   * Performs a Mulligan: reshuffles hand into library and draws 7
   */
  public mulligan(playerId: string): void {
    const zones = this.state.playerZones[playerId];
    if (!zones) return;

    // Put hand back into library
    zones.library.push(...zones.hand);
    zones.hand = [];

    // Shuffle with CSPRNG
    zones.library = secureShuffle(zones.library);

    // Draw 7 cards
    const drawCount = Math.min(7, zones.library.length);
    const drawn = zones.library.splice(0, drawCount);
    zones.hand.push(...drawn);

    this.syncPlayerCounts(playerId);
    this.addLog(playerId, `realizó un Mulligan (barajó su mano y robó 7 cartas)`);
    this.incrementVersion();
  }

  /**
   * Shuffles library with cryptographic randomness
   */
  public shuffleLibrary(playerId: string): void {
    const zones = this.state.playerZones[playerId];
    if (!zones || zones.library.length <= 1) return;

    zones.library = secureShuffle(zones.library);
    this.addLog(playerId, `barajó su biblioteca`);
    this.incrementVersion();
  }

  /**
   * Moves a card across zones
   */
  public moveCard(playerId: string, payload: MoveCardPayload): void {
    const zones = this.state.playerZones[playerId];
    if (!zones) return;

    const fromArray = zones[payload.fromZone];
    const toArray = zones[payload.toZone];
    if (!fromArray || !toArray) return;

    const cardIndex = fromArray.findIndex(c => c.instanceId === payload.cardInstanceId);
    if (cardIndex === -1) return;

    const [card] = fromArray.splice(cardIndex, 1);
    if (!card) return;

    // Adjust card properties on move
    if (payload.toZone === 'battlefield') {
      card.position = {
        x: payload.position?.x ?? 50,
        y: payload.position?.y ?? 50,
        zIndex: payload.position?.zIndex ?? 1,
      };
    } else {
      card.position = undefined;
      card.isTapped = false;
      card.isFaceDown = false;
    }

    if (payload.destinationIndex !== undefined && payload.destinationIndex >= 0) {
      toArray.splice(payload.destinationIndex, 0, card);
    } else {
      toArray.push(card);
    }

    this.syncPlayerCounts(playerId);
    this.addLog(
      playerId,
      `movió "${card.definition.name}" de ${payload.fromZone} a ${payload.toZone}`,
      true,
    );

    this.undoStack.push({
      playerId,
      description: `Revertir movimiento de ${card.definition.name}`,
      revert: () => {
        const idx = toArray.findIndex(c => c.instanceId === card.instanceId);
        if (idx !== -1) {
          toArray.splice(idx, 1);
          fromArray.splice(cardIndex, 0, card);
          this.syncPlayerCounts(playerId);
        }
      },
    });

    this.incrementVersion();
  }

  /**
   * Taps or untaps a card on the battlefield
   */
  public tapCard(playerId: string, payload: TapCardPayload): void {
    const zones = this.state.playerZones[playerId];
    if (!zones) return;

    const card = zones.battlefield.find(c => c.instanceId === payload.cardInstanceId);
    if (!card) return;

    card.isTapped = payload.isTapped;
    card.rotation = payload.isTapped ? 90 : 0;
    const actionDesc = payload.isTapped ? 'giró' : 'enderezó';
    this.addLog(playerId, `${actionDesc} "${card.definition.name}"`);
    this.incrementVersion();
  }

  /**
   * Untaps all permanents on the battlefield for a player
   */
  public untapAll(playerId: string): void {
    const zones = this.state.playerZones[playerId];
    if (!zones) return;

    for (const card of zones.battlefield) {
      card.isTapped = false;
      card.rotation = 0;
    }

    this.addLog(playerId, `enderezó todos sus permanentes`);
    this.incrementVersion();
  }

  /**
   * Flips a card face down or face up
   */
  public flipCard(playerId: string, payload: FlipCardPayload): void {
    const zones = this.state.playerZones[playerId];
    if (!zones) return;

    const card = zones.battlefield.find(c => c.instanceId === payload.cardInstanceId);
    if (!card) return;

    card.isFaceDown = payload.isFaceDown;
    this.addLog(
      playerId,
      `puso "${card.definition.name}" boca ${payload.isFaceDown ? 'abajo' : 'arriba'}`,
    );
    this.incrementVersion();
  }

  /**
   * Adds or removes counters from a card
   */
  public setCardCounter(playerId: string, payload: SetCardCounterPayload): void {
    const zones = this.state.playerZones[playerId];
    if (!zones) return;

    const card = zones.battlefield.find(c => c.instanceId === payload.cardInstanceId);
    if (!card) return;

    const current = card.counters[payload.counterType] || 0;
    const next = Math.max(0, current + payload.delta);
    if (next === 0) {
      delete card.counters[payload.counterType];
    } else {
      card.counters[payload.counterType] = next;
    }

    const sign = payload.delta > 0 ? `+${payload.delta}` : `${payload.delta}`;
    this.addLog(
      playerId,
      `modificó contadores ${payload.counterType} en "${card.definition.name}" en ${sign}`,
    );
    this.incrementVersion();
  }

  /**
   * Advances turn to next non-eliminated player
   */
  public passTurn(playerId: string): void {
    if (this.state.turnOrder.length === 0) return;

    const currentIndex = this.state.activePlayerId
      ? this.state.turnOrder.indexOf(this.state.activePlayerId)
      : -1;

    let nextIndex = (currentIndex + 1) % this.state.turnOrder.length;
    let attempts = 0;

    // Find next non-eliminated player
    while (attempts < this.state.turnOrder.length) {
      const candidateId = this.state.turnOrder[nextIndex]!;
      const candidatePlayer = this.state.players[candidateId];
      if (candidatePlayer && !candidatePlayer.isEliminated) {
        this.state.activePlayerId = candidateId;
        break;
      }
      nextIndex = (nextIndex + 1) % this.state.turnOrder.length;
      attempts++;
    }

    this.state.turnNumber++;
    const activePlayer = this.state.players[this.state.activePlayerId || ''];
    this.addLog(
      playerId,
      `pasó el turno a ${activePlayer?.name || 'siguiente jugador'} (Turno #${this.state.turnNumber})`,
    );

    this.incrementVersion();
  }

  /**
   * Rolls a die with N sides using CSPRNG
   */
  public rollDice(playerId: string, sides: number): number {
    const result = secureRoll(sides);
    this.addLog(playerId, `tiró un D${sides} y obtuvo un 🎲 ${result}`);
    this.incrementVersion();
    return result;
  }

  /**
   * Reverts the last undoable action by this player
   */
  public undoLast(playerId: string): boolean {
    let index = -1;
    for (let i = this.undoStack.length - 1; i >= 0; i--) {
      const entry = this.undoStack[i];
      if (entry && entry.playerId === playerId) {
        index = i;
        break;
      }
    }
    if (index === -1) return false;

    const [undoRecord] = this.undoStack.splice(index, 1);
    if (undoRecord) {
      undoRecord.revert();
      this.addLog(playerId, `deshizo su última acción: ${undoRecord.description}`);
      this.incrementVersion();
      return true;
    }
    return false;
  }

  /**
   * Adds chat message
   */
  public addChatMessage(playerId: string, message: string): void {
    const player = this.state.players[playerId];
    const sanitized = message
      .trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/on\w+\s*=/gi, '');
    this.addLog(playerId, `💬 ${player?.name}: ${sanitized}`);
    this.incrementVersion();
  }
}
