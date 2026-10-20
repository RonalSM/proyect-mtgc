import {
  RoomState,
  CardDefinition,
  CardInstance,
  GameLogEntry,
  AdjustLifePayload,
  SetLifePayload,
  SetPlayerStatusPayload,
  CommanderDamagePayload,
  SetPlayerCounterPayload,
  SetCardCounterPayload,
  SetCardPTPayload,
  MoveCardPayload,
  TapCardPayload,
  FlipCardPayload,
  CloneTokenPayload,
  ConfirmUndoPayload,
  SelectDeckPayload,
  SetReadyPayload,
  RevealCardPayload,
  UnrevealCardPayload,
  toArtCropUrl,
  getCardDimensions,
  computeCardPT,
} from '@mtgc/shared';
import { secureShuffle, secureRoll } from './csprng.js';
import { randomUUID, randomInt } from 'crypto';
import { redisSnapshotService } from '../services/redis-snapshot.service.js';
import { LobbyManager } from './lobby-manager.js';
import { GameStarter } from './game-starter.js';
import { InitiativeService } from './initiative-service.js';
import { MulliganService } from './mulligan-service.js';

interface UndoRecord {
  playerId: string;
  revert: () => void;
  description: string;
  affectsOpponents?: boolean;
  affectedPlayerIds?: string[];
}

export class GameStateSession {
  public state: RoomState;
  public lobbyManager: LobbyManager;
  public initiativeService: InitiativeService;
  public mulliganService: MulliganService;
  private undoStack: UndoRecord[] = [];

  constructor(initialState: RoomState) {
    this.state = initialState;
    this.lobbyManager = new LobbyManager(this.state);
    this.initiativeService = new InitiativeService(this);
    this.mulliganService = new MulliganService(this);
  }

  /**
   * Starts the game from the lobby (REQ-20.11) and triggers initiative phase (REQ-21)
   */
  public startGame(hostPlayerId: string): void {
    GameStarter.startGame(this, hostPlayerId);
    this.initiativeService.startAutomaticInitiative();
  }

  /**
   * Rolls D20 for initiative (REQ-21.2)
   */
  public rollD20Initiative(playerId: string): number {
    return this.initiativeService.rollD20(playerId);
  }

  /**
   * Starts the London Mulligan phase (Punto 5)
   */
  public startMulliganPhase(): void {
    this.mulliganService.startMulliganPhase();
  }

  public takeMulligan(playerId: string): void {
    this.mulliganService.takeMulligan(playerId);
  }

  public keepHand(playerId: string, bottomCardIds?: string[]): void {
    this.mulliganService.keepHand(playerId, bottomCardIds);
  }

  public forceMulliganDecision(hostPlayerId: string, targetPlayerId: string): void {
    this.mulliganService.forceDecision(hostPlayerId, targetPlayerId);
  }

  public cleanup(): void {
    this.initiativeService.cleanup();
  }

  /**
   * Sets custom playmat image URL (REQ-22.3)
   */
  public setPlaymat(playerId: string, playmatUrl: string): void {
    const player = this.state.players[playerId];
    if (!player) return;
    player.playmatUrl = toArtCropUrl(playmatUrl);
    this.addLog(playerId, 'actualizó su playmat de fondo');
    this.incrementVersion();
  }

  /**
   * Selects a deck for a player in the lobby (REQ-20.2, REQ-20.9)
   */
  public selectDeck(playerId: string, payload: SelectDeckPayload): void {
    const selected = this.lobbyManager.selectDeck(playerId, payload);
    this.addLog(playerId, `eligió el mazo "${selected.name}" (Comandante: ${selected.commanderName})`);
    this.incrementVersion();
  }

  /**
   * Toggles ready state in the lobby (REQ-20.8)
   */
  public setReady(playerId: string, payload: SetReadyPayload): void {
    const isReady = this.lobbyManager.setReady(playerId, payload.isReady);
    this.addLog(playerId, `está ${isReady ? 'Listo' : 'No listo'}`);
    this.incrementVersion();
  }

  public incrementVersion() {
    this.state.version++;
    redisSnapshotService.save(this.state.code, this.state).catch(() => {});
  }

  public addLog(playerId: string, actionText: string, isUndoable = false): GameLogEntry {
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

  public syncPlayerCounts(playerId: string) {
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
   * Adjusts life total and checks defeat risk condition (life <= 0) without automatic elimination (REQ-3.3)
   */
  public adjustLife(payload: AdjustLifePayload): void {
    const player = this.state.players[payload.playerId];
    if (!player) return;

    const previousLife = player.life;
    const previousIsAtRisk = player.isAtRisk;
    const previousRiskReason = player.riskReason;
    player.life += payload.delta;

    if (player.life <= 0) {
      player.isAtRisk = true;
      player.riskReason = 'life';
      this.addLog(payload.playerId, `está en riesgo de derrota (0 o menos vidas)`);
    } else if (player.riskReason === 'life') {
      player.isAtRisk = false;
      player.riskReason = undefined;
    }

    const sign = payload.delta > 0 ? `+${payload.delta}` : `${payload.delta}`;
    this.addLog(payload.playerId, `modificó su vida en ${sign} (Total: ${player.life})`, true);

    this.undoStack.push({
      playerId: payload.playerId,
      description: `Revertir cambio de vida ${sign}`,
      revert: () => {
        player.life = previousLife;
        player.isAtRisk = previousIsAtRisk;
        player.riskReason = previousRiskReason;
      },
    });

    this.incrementVersion();
  }

  /**
   * Sets exact life total (REQ-3.4) and flags defeat risk if <= 0
   */
  public setLife(payload: SetLifePayload): void {
    const player = this.state.players[payload.playerId];
    if (!player) return;

    const previousLife = player.life;
    const previousIsAtRisk = player.isAtRisk;
    const previousRiskReason = player.riskReason;

    player.life = payload.life;
    if (player.life <= 0) {
      player.isAtRisk = true;
      player.riskReason = 'life';
      this.addLog(payload.playerId, `está en riesgo de derrota (0 o menos vidas)`);
    } else if (player.riskReason === 'life') {
      player.isAtRisk = false;
      player.riskReason = undefined;
    }

    this.addLog(payload.playerId, `fijó su total de vidas en ${player.life}`, true);

    this.undoStack.push({
      playerId: payload.playerId,
      description: `Revertir fijar vida a ${player.life}`,
      revert: () => {
        player.life = previousLife;
        player.isAtRisk = previousIsAtRisk;
        player.riskReason = previousRiskReason;
      },
    });

    this.incrementVersion();
  }

  /**
   * Records commander combat damage and checks 21 damage rule for defeat risk (REQ-4.2)
   */
  public adjustCommanderDamage(payload: CommanderDamagePayload, actorPlayerId?: string): void {
    const target = this.state.players[payload.targetPlayerId];
    if (!target) return;

    const current = target.commanderDamage[payload.sourceCommanderInstanceId] ?? 0;
    const previous = current;
    const previousIsAtRisk = target.isAtRisk;
    const previousRiskReason = target.riskReason;

    const newDamage = Math.max(0, current + payload.delta);
    target.commanderDamage[payload.sourceCommanderInstanceId] = newDamage;

    if (newDamage >= 21) {
      target.isAtRisk = true;
      target.riskReason = 'commander_damage';
      this.addLog(
        payload.targetPlayerId,
        `está en riesgo de derrota (21 o más daño de comandante acumulado)`,
      );
    } else if (target.riskReason === 'commander_damage') {
      const any21 = Object.values(target.commanderDamage).some(v => v >= 21);
      if (!any21) {
        target.isAtRisk = false;
        target.riskReason = undefined;
      }
    }

    const sign = payload.delta > 0 ? `+${payload.delta}` : `${payload.delta}`;
    this.addLog(
      payload.targetPlayerId,
      `recibió ${sign} daño de comandante (Total: ${newDamage})`,
      true,
    );

    const effectiveActor = actorPlayerId || payload.targetPlayerId;
    const affectsOther = actorPlayerId !== undefined && actorPlayerId !== payload.targetPlayerId;

    this.undoStack.push({
      playerId: effectiveActor,
      description: `Revertir daño de comandante`,
      affectsOpponents: affectsOther,
      affectedPlayerIds: [payload.targetPlayerId],
      revert: () => {
        target.commanderDamage[payload.sourceCommanderInstanceId] = previous;
        target.isAtRisk = previousIsAtRisk;
        target.riskReason = previousRiskReason;
      },
    });

    this.incrementVersion();
  }

  /**
   * Manually sets player elimination/revival status (REQ-3.3, REQ-4.2)
   */
  public setPlayerStatus(payload: SetPlayerStatusPayload): void {
    const player = this.state.players[payload.playerId];
    if (!player) return;

    const prevEliminated = player.isEliminated;
    const prevReason = player.eliminationReason;

    player.isEliminated = payload.isEliminated;
    player.eliminationReason = payload.isEliminated
      ? ((payload.reason as any) || (player.riskReason ? player.riskReason : 'manual'))
      : undefined;

    this.addLog(
      payload.playerId,
      payload.isEliminated
        ? `fue eliminado de la mesa${player.eliminationReason ? ` (${player.eliminationReason})` : ''}`
        : `fue revivido en la mesa`,
      true,
    );

    this.undoStack.push({
      playerId: payload.playerId,
      description: `Revertir eliminación/revivisión de ${player.name}`,
      revert: () => {
        player.isEliminated = prevEliminated;
        player.eliminationReason = prevReason;
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
      const prevIsAtRisk = player.isAtRisk;
      const prevRiskReason = player.riskReason;
      player.counters.poison = Math.max(0, player.counters.poison + payload.delta);

      if (player.counters.poison >= 10) {
        player.isAtRisk = true;
        player.riskReason = 'poison';
        this.addLog(payload.playerId, `está en riesgo de derrota (10 o más contadores de veneno)`);
      } else if (player.riskReason === 'poison') {
        player.isAtRisk = false;
        player.riskReason = undefined;
      }

      this.undoStack.push({
        playerId: payload.playerId,
        description: 'Revertir veneno',
        revert: () => {
          player.counters.poison = prev;
          player.isAtRisk = prevIsAtRisk;
          player.riskReason = prevRiskReason;
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
    } else {
      // Custom named counters (REQ-5.3)
      if (!player.counters.custom) {
        player.counters.custom = {};
      }
      const prev = player.counters.custom[payload.counterType] ?? 0;
      const next = Math.max(0, prev + payload.delta);
      if (next === 0) {
        delete player.counters.custom[payload.counterType];
      } else {
        player.counters.custom[payload.counterType] = next;
      }
      this.undoStack.push({
        playerId: payload.playerId,
        description: `Revertir contador personalizado ${payload.counterType}`,
        revert: () => {
          if (prev === 0) {
            delete player.counters.custom[payload.counterType];
          } else {
            player.counters.custom[payload.counterType] = prev;
          }
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
    // Terminar revelaciones activas en mano al barajar (Punto 1)
    zones.hand.forEach(c => { delete c.revealedTo; });

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
   * Performs a Mulligan: only allowed during the 'mulligan' phase (Punto 5)
   */
  public mulligan(playerId: string): void {
    if (this.state.status === 'mulligan') {
      this.mulliganService.takeMulligan(playerId);
    } else {
      throw new Error('La acción de mulligan solo está permitida durante la fase inicial de mulligan.');
    }
  }

  /**
   * Shuffles library with cryptographic randomness
   */
  public shuffleLibrary(playerId: string): void {
    const zones = this.state.playerZones[playerId];
    if (!zones || zones.library.length <= 1) return;

    zones.library = secureShuffle(zones.library);
    // Terminar revelaciones activas en mano al barajar (Punto 1)
    zones.hand.forEach(c => { delete c.revealedTo; });
    this.addLog(playerId, `barajó su biblioteca`);
    this.incrementVersion();
  }

  /**
   * Computes which player's tabletop division contains the card bounding box (already rotated) at 100%.
   * If the box crosses between two divisions or goes outside, returns undefined (empty holderId).
   */
  public computeHolderId(
    position: { x: number; y: number },
    isTapped: boolean,
    viewport: { width: number; height: number } = { width: 1920, height: 1080 }
  ): string | undefined {
    const allSeated = Object.values(this.state.players).filter(p => !p.isSpectator);
    const totalPlayers = Math.max(2, allSeated.length);
    const isTwoPlayerMode = totalPlayers === 2;
    const cols = isTwoPlayerMode ? 2 : Math.min(3, Math.max(2, Math.ceil(totalPlayers / 2)));
    const seatedPlayers = [...allSeated].sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));

    // Exact oriented card dimensions (Punto 2: posición = centro, dimensiones orientadas)
    const cardDims = getCardDimensions(totalPlayers, viewport);
    const orientedW = isTapped ? cardDims.height : cardDims.width;
    const orientedH = isTapped ? cardDims.width : cardDims.height;
    const cardHalfWNorm = (orientedW / 2) / viewport.width;
    const cardHalfHNorm = (orientedH / 2) / viewport.height;

    const cardLeft = position.x - cardHalfWNorm;
    const cardTop = position.y - cardHalfHNorm;
    const cardRight = position.x + cardHalfWNorm;
    const cardBottom = position.y + cardHalfHNorm;

    for (let i = 0; i < seatedPlayers.length; i++) {
      const p = seatedPlayers[i];
      if (!p) continue;

      let xMin: number;
      let xMax: number;
      let yMin: number;
      let yMax: number;

      if (isTwoPlayerMode) {
        xMin = i === 0 ? 0.0 : 0.5;
        xMax = i === 0 ? 0.5 : 1.0;
        yMin = 0.0;
        yMax = 1.0;
      } else {
        const row = i < cols ? 0 : 1;
        const col = i < cols ? i : i - cols;
        xMin = col / cols;
        xMax = (col + 1) / cols;
        yMin = row === 0 ? 0.0 : 0.5;
        yMax = row === 0 ? 0.5 : 1.0;
      }

      // Check if 100% inside division (with 0.01 margin for subpixel precision)
      const isInside =
        cardLeft >= xMin - 0.01 &&
        cardRight <= xMax + 0.01 &&
        cardTop >= yMin - 0.01 &&
        cardBottom <= yMax + 0.01;

      if (isInside) {
        return p.id;
      }
    }

    return undefined;
  }

  /**
   * Computes the normalized center coordinates of a player's division with cascade offset (Punto 2 & Punto 4)
   * Uses actual rendered card dimensions to ensure exact centering (<= 1px) in the playable section.
   */
  public computePlayerDivisionCenter(
    targetPlayerId: string,
    viewport: { width: number; height: number } = { width: 1920, height: 1080 }
  ): { x: number; y: number } {
    const allSeated = Object.values(this.state.players).filter(p => !p.isSpectator);
    const totalPlayers = Math.max(2, allSeated.length);
    const isTwoPlayerMode = totalPlayers === 2;
    const cols = isTwoPlayerMode ? 2 : Math.min(3, Math.max(2, Math.ceil(totalPlayers / 2)));
    const seatedPlayers = [...allSeated].sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));
    const playerIdx = seatedPlayers.findIndex(p => p.id === targetPlayerId);

    let xMin = 0;
    let width = 1;
    let yMin = 0;
    let height = 1;

    if (playerIdx !== -1) {
      if (isTwoPlayerMode) {
        xMin = playerIdx === 0 ? 0.0 : 0.5;
        width = 0.5;
        yMin = 0.0;
        height = 1.0;
      } else {
        const row = playerIdx < cols ? 0 : 1;
        const col = playerIdx < cols ? playerIdx : playerIdx - cols;
        xMin = col / cols;
        width = 1 / cols;
        yMin = row === 0 ? 0.0 : 0.5;
        height = 0.5;
      }
    }

    // Altura del dock inferior normalizada en viewport 1080p:
    // En 2 jugadores (1080p completo): dock ~162px => 0.15
    // En 4 y 6 jugadores (celda 540px): dock ~135px => 0.125
    const dockHeightNorm = isTwoPlayerMode ? 0.15 : 0.125;
    const playableHeight = height - dockHeightNorm;

    const centerX = xMin + width * 0.5;
    const centerY = yMin + playableHeight * 0.5;

    // Tamaño real de la carta para que quede exactamente centrada en la sección jugable (Punto 4 & Punto 2)
    const cardDims = getCardDimensions(totalPlayers, viewport);
    const cardHalfWNorm = (cardDims.width / 2) / viewport.width;
    const cardHalfHNorm = (cardDims.height / 2) / viewport.height;

    const existingCount = this.state.playerZones[targetPlayerId]?.battlefield?.length ?? 0;
    const cascadeOffset = (existingCount % 5) * 0.015;

    // Convención única (Punto 2): la posición retornada es el centro de la carta
    const minX = xMin + cardHalfWNorm + 0.01;
    const maxX = xMin + width - cardHalfWNorm - 0.01;
    const minY = yMin + cardHalfHNorm + 0.01;
    const maxY = yMin + playableHeight - cardHalfHNorm - 0.01;

    return {
      x: Math.max(minX, Math.min(maxX, centerX + cascadeOffset)),
      y: Math.max(minY, Math.min(maxY, centerY + cascadeOffset)),
    };
  }

  /**
   * Finds a card on any battlefield in the room
   */
  public findBattlefieldCard(instanceId: string): { card: CardInstance; playerId: string; index: number } | undefined {
    for (const [pId, zones] of Object.entries(this.state.playerZones)) {
      const idx = zones.battlefield.findIndex(c => c.instanceId === instanceId);
      if (idx !== -1 && zones.battlefield[idx]) {
        return { card: zones.battlefield[idx]!, playerId: pId, index: idx };
      }
    }
    return undefined;
  }

  /**
   * Moves a card across zones with strict ownership and holderId authorization (Punto 5, REQ-9.2)
   */
  public moveCard(playerId: string, payload: MoveCardPayload): void {
    let fromPlayerId = (payload as any).fromPlayerId || playerId;
    let fromArray: CardInstance[] | undefined;
    let cardIndex = -1;

    if (payload.fromZone === 'battlefield') {
      const found = this.findBattlefieldCard(payload.cardInstanceId);
      if (found) {
        fromPlayerId = found.playerId;
        fromArray = this.state.playerZones[found.playerId]!.battlefield;
        cardIndex = found.index;
      }
    } else {
      // Buscar primero en fromPlayerId
      const fromZones = this.state.playerZones[fromPlayerId];
      if (fromZones && fromZones[payload.fromZone]) {
        cardIndex = fromZones[payload.fromZone].findIndex(c => c.instanceId === payload.cardInstanceId);
        if (cardIndex !== -1) {
          fromArray = fromZones[payload.fromZone];
        }
      }
      // Si no se encontró y es zona pública (cementerio o exilio), buscar en todos los jugadores
      if (cardIndex === -1 && (payload.fromZone === 'graveyard' || payload.fromZone === 'exile')) {
        for (const [pId, zones] of Object.entries(this.state.playerZones)) {
          const idx = zones[payload.fromZone]?.findIndex(c => c.instanceId === payload.cardInstanceId) ?? -1;
          if (idx !== -1) {
            fromPlayerId = pId;
            fromArray = zones[payload.fromZone];
            cardIndex = idx;
            break;
          }
        }
      }
    }

    if (cardIndex === -1 || !fromArray) return;
    const cardToMove = fromArray[cardIndex];
    if (!cardToMove) return;

    // Punto 5: Comprobación estricta de autorización de movimiento:
    // Quién puede mover una carta: su ownerId siempre (incluso para recuperarla de la mesa de otro)
    // y cualquier otro jugador solo si es su holderId (si la carta está en su sección y 100% dentro de ella).
    const isOwner = cardToMove.ownerId === playerId;
    const isHolder = cardToMove.holderId === playerId;

    if (!isOwner && !isHolder) {
      this.addLog(
        playerId,
        `⚠️ Acción no autorizada: intentó mover "${cardToMove.definition.name}" sin ser su propietario original ni su titular temporal`,
      );
      this.incrementVersion();
      throw new Error(
        `Acción no autorizada: no eres el propietario original (${cardToMove.ownerId}) ni el titular actual (${cardToMove.holderId}) de "${cardToMove.definition.name}".`,
      );
    }

    const previousHolderId = cardToMove.holderId;
    const previousPosition = cardToMove.position ? { ...cardToMove.position } : undefined;

    // Remove from source array
    const [card] = fromArray.splice(cardIndex, 1);
    if (!card) return;

    // Al salir de la mano o moverse de zona, termina cualquier revelación activa (Punto 1)
    if (payload.fromZone === 'hand' || card.revealedTo) {
      delete card.revealedTo;
    }

    // Target player zone
    let targetPlayerId = payload.toPlayerId || fromPlayerId || playerId;

    if (payload.toZone === 'battlefield') {
      let posX = payload.position?.x;
      let posY = payload.position?.y;

      // Punto 2: Si no se provee posición o viene de la posición por defecto (0.5, 0.5) desde menú/acción fuera de la mesa,
      // enviar al centro de la sección del propio jugador con desplazamiento en cascada
      if (
        posX === undefined ||
        posY === undefined ||
        (posX === 0.5 && posY === 0.5 && payload.fromZone !== 'battlefield')
      ) {
        const cascadePos = this.computePlayerDivisionCenter(targetPlayerId);
        posX = cascadePos.x;
        posY = cascadePos.y;
      }

      card.position = {
        x: posX,
        y: posY,
        zIndex: payload.position?.zIndex ?? 1,
      };

      // Garantizar ownerId
      if (!card.ownerId) {
        card.ownerId = targetPlayerId;
      }

      // Punto 5 y Punto 2: Calcular holderId:
      let newHolderId: string | undefined = undefined;
      const geomHolder = this.computeHolderId({ x: posX, y: posY }, !!card.isTapped);
      if (payload.holderId !== undefined && payload.holderId !== null) {
        if (!payload.holderId || payload.holderId === geomHolder) {
          newHolderId = payload.holderId || undefined;
        } else {
          newHolderId = geomHolder;
        }
      } else {
        newHolderId = geomHolder;
      }

      // Si la carta entra en la sección del propio jugador, su holderId es el jugador
      card.holderId = newHolderId;
      targetPlayerId = payload.toPlayerId || card.ownerId;
    } else {
      card.position = undefined;
      card.isTapped = false;
      card.isFaceDown = false;
      card.holderId = undefined; // Fuera del campo de batalla no hay titular temporal
      card.counters = {};
      delete card.basePower;
      delete card.baseToughness;
      delete card.keywords;
      // Fuera del campo de batalla siempre regresa a zonas del propietario original (salvo donación explícita)
      targetPlayerId = payload.toPlayerId || card.ownerId;
    }

    const toZones = this.state.playerZones[targetPlayerId] || this.state.playerZones[card.ownerId];
    if (!toZones) return;

    const toArray = toZones[payload.toZone];
    if (!toArray) return;

    if (payload.toZone === 'library') {
      if (payload.randomPosition || payload.isRandom) {
        // Punto 2: "Aleatoria" inserta la carta en una posición al azar uniforme (0 a toArray.length) con CSPRNG
        const randomIndex = randomInt(0, toArray.length + 1);
        toArray.splice(randomIndex, 0, card);
      } else if (payload.destinationIndex !== undefined && payload.destinationIndex >= 0) {
        const destIdx = Math.min(payload.destinationIndex, toArray.length);
        toArray.splice(destIdx, 0, card);
      } else {
        // Punto 6: Arrastrar una carta a la biblioteca la deja ARRIBA (índice 0, es la próxima que se roba)
        toArray.unshift(card);
      }
    } else if (payload.destinationIndex !== undefined && payload.destinationIndex >= 0) {
      toArray.splice(payload.destinationIndex, 0, card);
    } else {
      toArray.push(card);
    }

    this.syncPlayerCounts(fromPlayerId);
    if (targetPlayerId !== fromPlayerId) {
      this.syncPlayerCounts(targetPlayerId);
    }

    // Punto 3: Sin motor de reglas para impuesto de comandante; NO se incrementa automáticamente al devolver a la zona de comando.
    // El impuesto se gestiona únicamente de forma manual con los botones ±2 de la zona de comando.
    if (payload.toZone === 'command' && card.isCommander) {
      this.addLog(
        playerId,
        `devolvió su comandante "${card.definition.name}" a la zona de comando`,
        true,
      );
    } else if (payload.toZone === 'library') {
      // Punto 2: La bitácora registra "X envió una carta a su biblioteca" sin revelar la posición
      this.addLog(
        playerId,
        'envió una carta a su biblioteca',
        true,
      );
    } else if (payload.fromZone === 'battlefield' && payload.toZone === 'battlefield') {
      this.addLog(
        playerId,
        `movió "${card.definition.name}"`,
        true,
      );
    } else if (payload.fromZone === 'hand' && payload.toZone === 'battlefield') {
      this.addLog(
        playerId,
        `jugó "${card.definition.name}" al campo de batalla`,
        true,
      );
    } else {
      this.addLog(
        playerId,
        `movió "${card.definition.name}" de ${payload.fromZone} a ${payload.toZone}`,
        true,
      );
    }

    this.undoStack.push({
      playerId,
      description: `Revertir movimiento de ${card.definition.name}`,
      revert: () => {
        const idx = toArray.findIndex(c => c.instanceId === card.instanceId);
        if (idx !== -1) {
          toArray.splice(idx, 1);
          card.holderId = previousHolderId;
          card.position = previousPosition;
          fromArray.splice(cardIndex, 0, card);
          this.syncPlayerCounts(fromPlayerId);
          if (targetPlayerId !== fromPlayerId) {
            this.syncPlayerCounts(targetPlayerId);
          }
        }
      },
    });

    this.incrementVersion();
  }

  /**
   * Revela una carta sin moverla a un jugador específico o a todos (Punto 7)
   */
  public revealCard(
    playerId: string,
    payload: RevealCardPayload,
  ): { card: CardInstance; fromPlayerId: string; fromPlayerName: string; targetPlayerId?: string; targetPlayerName?: string } | undefined {
    const fromPlayer = this.state.players[playerId];
    const fromPlayerName = fromPlayer?.name || 'Jugador';

    // Buscar en zonas del jugador emisor
    const zones = this.state.playerZones[playerId];
    let foundCard: CardInstance | undefined;
    if (zones) {
      if (payload.fromZone && zones[payload.fromZone]) {
        foundCard = zones[payload.fromZone].find(c => c.instanceId === payload.cardInstanceId);
      }
      if (!foundCard) {
        for (const zoneList of Object.values(zones)) {
          foundCard = (zoneList as CardInstance[]).find((c: CardInstance) => c.instanceId === payload.cardInstanceId);
          if (foundCard) break;
        }
      }
    }
    // Fallback: buscar en campo de batalla
    if (!foundCard) {
      const bf = this.findBattlefieldCard(payload.cardInstanceId);
      if (bf) foundCard = bf.card;
    }

    if (!foundCard) return undefined;

    // A.1: Revelar persistente en la mano (Punto 1)
    if (payload.targetPlayerId) {
      if (foundCard.revealedTo !== 'all') {
        const current = Array.isArray(foundCard.revealedTo) ? [...foundCard.revealedTo] : [];
        if (!current.includes(payload.targetPlayerId)) {
          current.push(payload.targetPlayerId);
        }
        foundCard.revealedTo = current;
      }
    } else {
      foundCard.revealedTo = 'all';
    }

    let targetPlayerName: string | undefined;
    if (payload.targetPlayerId && this.state.players[payload.targetPlayerId]) {
      targetPlayerName = this.state.players[payload.targetPlayerId]?.name || 'Jugador';
      this.addLog(playerId, `reveló una carta a ${targetPlayerName}`, false);
    } else {
      this.addLog(playerId, `reveló "${foundCard.definition.name}" a todos`, false);
    }

    this.incrementVersion();

    return {
      card: foundCard,
      fromPlayerId: playerId,
      fromPlayerName,
      targetPlayerId: payload.targetPlayerId,
      targetPlayerName,
    };
  }

  /**
   * Taps or untaps a card on the battlefield (owner or holder)
   */
  /**
   * Deja de revelar una carta de la mano (Punto 1)
   */
  public unrevealCard(
    playerId: string,
    payload: UnrevealCardPayload,
  ): boolean {
    const zones = this.state.playerZones[playerId];
    if (!zones) return false;

    let foundCard = zones.hand.find(c => c.instanceId === payload.cardInstanceId);
    if (!foundCard) {
      for (const zoneList of Object.values(zones)) {
        foundCard = (zoneList as CardInstance[]).find(c => c.instanceId === payload.cardInstanceId);
        if (foundCard) break;
      }
    }

    if (!foundCard || !foundCard.revealedTo) return false;

    delete foundCard.revealedTo;
    this.incrementVersion();
    return true;
  }

  public tapCard(playerId: string, payload: TapCardPayload): void {
    const found = this.findBattlefieldCard(payload.cardInstanceId);
    if (!found) return;

    const card = found.card;
    const isOwner = card.ownerId === playerId;
    const isHolder = card.holderId === playerId;
    if (!isOwner && !isHolder) {
      throw new Error('No autorizado: solo el propietario original o el titular temporal pueden girar esta carta.');
    }

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
    const found = this.findBattlefieldCard(payload.cardInstanceId);
    if (!found) return;

    const card = found.card;
    const isOwner = card.ownerId === playerId;
    const isHolder = card.holderId === playerId;
    if (!isOwner && !isHolder) {
      throw new Error('No autorizado: solo el propietario original o el titular temporal pueden voltear esta carta.');
    }

    card.isFaceDown = payload.isFaceDown;
    this.addLog(
      playerId,
      `puso "${card.definition.name}" boca ${payload.isFaceDown ? 'abajo' : 'arriba'}`,
    );
    this.incrementVersion();
  }

  /**
   * Clones a token or permanent on the battlefield (REQ-9.4)
   */
  public cloneToken(playerId: string, payload: CloneTokenPayload): void {
    const found = this.findBattlefieldCard(payload.cardInstanceId);
    if (!found) return;

    const sourceCard = found.card;
    const isOwner = sourceCard.ownerId === playerId;
    const isHolder = sourceCard.holderId === playerId;
    if (!isOwner && !isHolder) {
      throw new Error('No autorizado: solo el propietario original o el titular temporal pueden clonar este permanente.');
    }

    const clonedPos = {
      x: Math.min(0.9, (sourceCard.position?.x ?? 0.5) + 0.03),
      y: Math.min(0.9, (sourceCard.position?.y ?? 0.5) + 0.03),
    };

    const clonedInstance: CardInstance = {
      instanceId: randomUUID(),
      definition: {
        ...sourceCard.definition,
        name: sourceCard.definition.name.includes('(Token)')
          ? sourceCard.definition.name
          : `${sourceCard.definition.name} (Token)`,
      },
      ownerId: playerId, // Inmutable: para fichas el que las crea
      controllerId: playerId,
      holderId: this.computeHolderId(clonedPos, false),
      isCommander: false,
      isTapped: false,
      isFaceDown: false,
      rotation: 0,
      counters: { ...sourceCard.counters },
      position: {
        ...clonedPos,
        zIndex: (sourceCard.position?.zIndex ?? 1) + 1,
      },
    };

    const targetZones = this.state.playerZones[clonedInstance.holderId || playerId] || this.state.playerZones[playerId];
    if (targetZones) {
      targetZones.battlefield.push(clonedInstance);
    }
    this.addLog(playerId, `clonó el token/permanente "${sourceCard.definition.name}"`, true);

    this.undoStack.push({
      playerId,
      description: `Revertir clon de ${sourceCard.definition.name}`,
      revert: () => {
        if (targetZones) {
          const idx = targetZones.battlefield.findIndex(c => c.instanceId === clonedInstance.instanceId);
          if (idx !== -1) {
            targetZones.battlefield.splice(idx, 1);
          }
        }
      },
    });

    this.incrementVersion();
  }

  /**
   * Adds or removes counters from a card
   */
  public setCardCounter(playerId: string, payload: SetCardCounterPayload): void {
    const found = this.findBattlefieldCard(payload.cardInstanceId);
    if (!found) return;

    const card = found.card;
    if (card.isFaceDown) {
      throw new Error('No se pueden modificar contadores de una carta boca abajo.');
    }

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
   * Modifica los valores de poder y resistencia (base y contadores) en una carta visible de la mesa (Punto 3)
   */
  public setCardPT(playerId: string, payload: SetCardPTPayload): void {
    const found = this.findBattlefieldCard(payload.cardInstanceId);
    if (!found) return;

    const card = found.card;
    if (card.isFaceDown) {
      throw new Error('No se puede modificar el poder y resistencia de una carta boca abajo.');
    }

    if (payload.basePower !== undefined) {
      if (payload.basePower === null) {
        delete card.basePower;
      } else {
        card.basePower = payload.basePower;
      }
    }

    if (payload.baseToughness !== undefined) {
      if (payload.baseToughness === null) {
        delete card.baseToughness;
      } else {
        card.baseToughness = payload.baseToughness;
      }
    }

    if (payload.plusCounters !== undefined) {
      if (payload.plusCounters === 0) {
        delete card.counters['+1/+1'];
      } else {
        card.counters['+1/+1'] = payload.plusCounters;
      }
    }

    if (payload.minusCounters !== undefined) {
      if (payload.minusCounters === 0) {
        delete card.counters['-1/-1'];
        delete card.counters['−1/−1'];
      } else {
        delete card.counters['-1/-1'];
        card.counters['−1/−1'] = payload.minusCounters;
      }
    }

    const ptInfo = computeCardPT(card);
    const ptText = ptInfo ? ptInfo.text : 'N/A';

    this.addLog(
      playerId,
      `modificó poder/resistencia de "${card.definition.name}" a ${ptText}`,
      true,
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
   * Allows the host to adjust turn order before the first turn (REQ-6.4).
   */
  public setTurnOrder(hostPlayerId: string, newTurnOrder: string[]): void {
    const caller = this.state.players[hostPlayerId];
    if (!caller || (!caller.isHost && this.state.hostId !== hostPlayerId)) {
      throw new Error('Solo el anfitrión puede corregir el orden de turnos.');
    }

    if (this.state.turnNumber > 1) {
      throw new Error('El orden de turnos solo puede corregirse antes o durante el primer turno.');
    }

    // Ensure all seated non-spectator players are included
    const validPlayers = Object.keys(this.state.players).filter(
      id => !this.state.players[id]?.isSpectator,
    );

    const hasAllPlayers =
      newTurnOrder.length === validPlayers.length &&
      validPlayers.every(id => newTurnOrder.includes(id));

    if (!hasAllPlayers) {
      throw new Error('El nuevo orden de turnos debe incluir a todos los jugadores de la mesa.');
    }

    this.state.turnOrder = [...newTurnOrder];
    if (this.state.turnOrder.length > 0) {
      this.state.activePlayerId = this.state.turnOrder[0]!;
    }

    this.addLog(hostPlayerId, 'corrigió el orden de turnos de la mesa');
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
   * Reverts the last undoable action by this player.
   * If the action affects other players (REQ-11.3), creates a table confirmation proposal.
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

    const undoRecord = this.undoStack[index];
    if (!undoRecord) return false;

    // REQ-11.3: WHERE la acción afecta a otros jugadores, THE sistema SHALL pedir confirmación de la mesa.
    if (undoRecord.affectsOpponents) {
      const targetIds =
        undoRecord.affectedPlayerIds && undoRecord.affectedPlayerIds.length > 0
          ? undoRecord.affectedPlayerIds
          : Object.keys(this.state.players).filter(
              id => id !== playerId && !this.state.players[id]?.isSpectator,
            );

      const proposalId = randomUUID();
      this.state.pendingUndoProposal = {
        id: proposalId,
        proposerId: playerId,
        proposerName: this.state.players[playerId]?.name || 'Jugador',
        description: undoRecord.description,
        targetPlayerIds: targetIds,
        approvals: {},
        createdAt: Date.now(),
      };

      this.addLog(
        playerId,
        `solicitó deshacer "${undoRecord.description}" (afecta a otros jugadores; requiere confirmación de la mesa)`,
      );
      this.incrementVersion();
      return false; // Pending table confirmation
    }

    // Direct revert if it only affected the player themselves
    this.undoStack.splice(index, 1);
    undoRecord.revert();
    this.addLog(playerId, `deshizo su última acción: ${undoRecord.description}`);
    this.incrementVersion();
    return true;
  }

  /**
   * Responds to an undo proposal that affects opponents (REQ-11.3)
   */
  public confirmUndo(responderId: string, payload: ConfirmUndoPayload): boolean {
    if (!this.state.pendingUndoProposal || this.state.pendingUndoProposal.id !== payload.proposalId) {
      return false;
    }

    const proposal = this.state.pendingUndoProposal;
    const responderName = this.state.players[responderId]?.name || 'Jugador';

    if (!payload.approved) {
      this.addLog(responderId, `${responderName} rechazó la solicitud de deshacer "${proposal.description}"`);
      this.state.pendingUndoProposal = undefined;
      this.incrementVersion();
      return false;
    }

    proposal.approvals[responderId] = true;

    // Check if all targeted players have approved
    const allApproved = proposal.targetPlayerIds.every(
      targetId => proposal.approvals[targetId] === true || !this.state.players[targetId]?.isConnected,
    );

    if (allApproved) {
      let index = -1;
      for (let i = this.undoStack.length - 1; i >= 0; i--) {
        const entry = this.undoStack[i];
        if (entry && entry.playerId === proposal.proposerId) {
          index = i;
          break;
        }
      }
      if (index !== -1) {
        const [record] = this.undoStack.splice(index, 1);
        record?.revert();
        this.addLog(
          proposal.proposerId,
          `deshizo con confirmación de la mesa: ${proposal.description}`,
        );
      }
      this.state.pendingUndoProposal = undefined;
      this.incrementVersion();
      return true;
    } else {
      this.addLog(responderId, `aprobó la solicitud de deshacer de "${proposal.proposerName}"`);
      this.incrementVersion();
      return false;
    }
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
