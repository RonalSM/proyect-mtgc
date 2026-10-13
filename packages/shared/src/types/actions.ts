import { ZoneType } from './zone.js';
import { CardDefinition } from './card.js';

export type GameActionType =
  // Life & Counters
  | 'ADJUST_LIFE'
  | 'SET_LIFE'
  | 'COMMANDER_DAMAGE'
  | 'SET_PLAYER_COUNTER'
  | 'SET_PLAYER_STATUS'
  | 'SET_CARD_COUNTER'
  // Card Movements & State
  | 'MOVE_CARD'
  | 'TAP_CARD'
  | 'UNTAP_ALL'
  | 'FLIP_CARD'
  | 'CLONE_TOKEN'
  | 'DRAW_CARDS'
  | 'MULLIGAN'
  | 'SHUFFLE_LIBRARY'
  // Turn Management
  | 'PASS_TURN'
  | 'SET_TURN_ORDER'
  // Utility & Social
  | 'ROLL_DICE'
  | 'UNDO_LAST'
  | 'CONFIRM_UNDO'
  | 'CHAT_MESSAGE'
  // Deck Loading
  | 'LOAD_DECK'
  // Host Moderation & Room Settings (REQ-12.3, REQ-13)
  | 'KICK_PLAYER'
  | 'TRANSFER_HOST'
  | 'UPDATE_ROOM_SETTINGS';

export interface AdjustLifePayload {
  playerId: string;
  delta: number;
}

export interface SetLifePayload {
  playerId: string;
  life: number;
}

export interface SetPlayerStatusPayload {
  playerId: string;
  isEliminated: boolean;
  reason?: 'life' | 'commander_damage' | 'poison' | 'conceded' | 'manual' | string;
}

export interface CommanderDamagePayload {
  targetPlayerId: string;
  sourceCommanderInstanceId: string;
  delta: number;
}

export interface SetPlayerCounterPayload {
  playerId: string;
  counterType: 'poison' | 'energy' | 'experience' | 'commanderTax' | string;
  delta: number;
}

export interface SetCardCounterPayload {
  cardInstanceId: string;
  counterType: string; // e.g. '+1/+1', 'loyalty', 'charge'
  delta: number;
}

export interface MoveCardPayload {
  cardInstanceId: string;
  fromZone: ZoneType;
  toZone: ZoneType;
  toPlayerId?: string; // If donating or transferring control
  position?: {
    x: number;
    y: number;
    zIndex?: number;
  };
  destinationIndex?: number; // e.g. 0 for top of library, -1 for bottom
}

export interface TapCardPayload {
  cardInstanceId: string;
  isTapped: boolean;
}

export interface FlipCardPayload {
  cardInstanceId: string;
  isFaceDown: boolean;
}

export interface CloneTokenPayload {
  cardInstanceId: string;
}

export interface DrawCardsPayload {
  playerId: string;
  count: number;
}

export interface RollDicePayload {
  sides: number; // e.g. 20, 6, 2 (coin flip)
}

export interface ChatMessagePayload {
  message: string;
}

export interface LoadDeckCardItem {
  definition: CardDefinition;
  isCommander: boolean;
  quantity: number;
}

export interface LoadDeckPayload {
  commanderCards: CardDefinition[];
  maindeckCards: CardDefinition[];
}

export interface KickPlayerPayload {
  seat?: number;
  playerId?: string;
  reason?: string;
}

export interface TransferHostPayload {
  newHostSeat?: number;
  newHostId?: string;
}

export interface ConfirmUndoPayload {
  proposalId: string;
  approved: boolean;
}

export interface UpdateRoomSettingsPayload {
  videoCallUrl?: string;
  turnTimerSeconds?: number;
  allowSpectators?: boolean;
}

export interface SetTurnOrderPayload {
  turnOrder: string[];
}

