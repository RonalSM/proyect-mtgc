import { PlayerState } from './player.js';
import { CardInstance } from './card.js';

export type RoomStatus = 'lobby' | 'in_progress' | 'ended';

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
}
