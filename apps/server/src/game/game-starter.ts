import { randomUUID } from 'crypto';
import { secureShuffle } from './csprng.js';
import type { GameStateSession } from './game-state.js';

export class GameStarter {
  /**
   * Starts the game from the lobby (REQ-20.11).
   * - Validates start conditions via LobbyManager
   * - Moves commander(s) to command zone
   * - Shuffles maindeck into library using CSPRNG
   * - Deals 7-card opening hand
   * - Transitions room status to 'initiative' with a 15-second deadline
   */
  public static startGame(session: GameStateSession, hostPlayerId: string): void {
    const check = session.lobbyManager.canStartGame(hostPlayerId);
    if (!check.canStart) {
      throw new Error(check.reason || 'No se puede iniciar la partida.');
    }

    const state = session.state;
    const seatedPlayers = Object.values(state.players).filter(p => !p.isSpectator);

    for (const player of seatedPlayers) {
      const pendingDeck = session.lobbyManager.getPendingDeck(player.id);
      if (!pendingDeck) {
        throw new Error(`El jugador ${player.name} no tiene mazo cargado.`);
      }

      let zones = state.playerZones[player.id];
      if (!zones) {
        zones = {
          library: [],
          hand: [],
          battlefield: [],
          graveyard: [],
          exile: [],
          command: [],
        };
        state.playerZones[player.id] = zones;
      }

      // Reset all zones
      zones.command = [];
      zones.library = [];
      zones.hand = [];
      zones.battlefield = [];
      zones.graveyard = [];
      zones.exile = [];

      // 1. Place commanders in command zone
      for (const cmd of pendingDeck.commanderCards) {
        zones.command.push({
          instanceId: randomUUID(),
          definition: cmd,
          ownerId: player.id,
          controllerId: player.id,
          isCommander: true,
          isTapped: false,
          isFaceDown: false,
          rotation: 0,
          counters: {},
        });
      }

      // 2. Place maindeck in library
      for (const card of pendingDeck.maindeckCards) {
        zones.library.push({
          instanceId: randomUUID(),
          definition: card,
          ownerId: player.id,
          controllerId: player.id,
          isCommander: false,
          isTapped: false,
          isFaceDown: false,
          rotation: 0,
          counters: {},
        });
      }

      // 3. Shuffle library with CSPRNG (REQ-20.11 / crypto.randomInt)
      zones.library = secureShuffle(zones.library);

      // 4. Deal opening hand of 7 cards (REQ-20.11)
      const handSize = Math.min(7, zones.library.length);
      zones.hand = zones.library.splice(0, handSize);

      player.deckLoaded = true;
      player.life = state.settings.startingLife;
      player.isEliminated = false;
      player.isAtRisk = false;
      player.riskReason = undefined;
      player.initiativeRoll = undefined;
      player.initiativeOrder = undefined;

      session.syncPlayerCounts(player.id);
    }

    // 5. Transition to 'initiative' with 15s deadline (REQ-21)
    state.status = 'initiative';
    state.initiative = {
      round: 1,
      deadlineTimestamp: Date.now() + 15000,
      rolls: {},
    };

    session.addLog(
      hostPlayerId,
      'inició la partida. Se colocaron los comandantes en la zona de comando, se barajaron las bibliotecas con CSPRNG y se repartió la mano de 7 cartas.',
    );
    session.incrementVersion();
  }
}
