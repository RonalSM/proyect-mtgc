import { PlayerState } from './player.js';
import { CardInstance } from './card.js';

export type RoomStatus =
  'lobby' | 'initiative' | 'mulligan' | 'playing' | 'finished' | 'in_progress' | 'ended';

export interface MulliganPlayerState {
  playerId: string;
  mulliganCount: number; // 0 = mano inicial sin mulligan, 1 = 1er mulligan (gratis en Commander), 2+ = k-1 al fondo
  hasKept: boolean;
  cardsToBottomCount: number; // max(0, mulliganCount - 1)
  cardsPutToBottom?: string[]; // instanceIds
}

export interface MulliganState {
  currentDecidingPlayerId: string | null; // Jugador en turno de decision segun turnOrder
  players: Record<string, MulliganPlayerState>;
}

export interface InitiativeState {
  round: number; // 1 to 5
  deadlineTimestamp: number; // 15s timeout
  rolls: Record<string, number>; // playerId -> roll (1..20)
  activeTiedPlayerIds?: string[]; // players involved in current tie round
  resolvedOrder?: string[]; // final sorted playerIds (1st, 2nd...)
}

export interface RoomSettings {
  startingLife: number; // Default 40
  maxPlayers: number; // 2 to 6
  turnTimerSeconds?: number;
  allowSpectators: boolean;
}

export interface PlayerZones {
  library: CardInstance[]; // When hidden to client, only lengths or blurred instances are sent
  hand: CardInstance[];
  battlefield: CardInstance[];
  graveyard: CardInstance[];
  exile: CardInstance[];
  command: CardInstance[];
}

export interface GameLogEntry {
  id: string;
  timestamp: number;
  playerId: string;
  playerName: string;
  actionText: string;
  isUndoable: boolean;
}

export interface UndoProposal {
  id: string;
  proposerId: string;
  proposerName: string;
  description: string;
  targetPlayerIds: string[];
  approvals: Record<string, boolean>;
  createdAt: number;
}

export interface RoomState {
  id: string;
  code: string;
  name: string;
  hostId: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: Record<string, PlayerState>;
  playerZones: Record<string, PlayerZones>;
  turnOrder: string[];
  activePlayerId: string | null;
  turnNumber: number;
  version: number; // Monotonically increasing event/state version
  logs: GameLogEntry[];
  pendingUndoProposal?: UndoProposal;
  initiative?: InitiativeState;
  mulligan?: MulliganState;
}
