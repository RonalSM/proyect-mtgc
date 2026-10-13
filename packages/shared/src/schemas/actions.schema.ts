import { z } from 'zod';

export const ZoneTypeSchema = z.enum([
  'library',
  'hand',
  'battlefield',
  'graveyard',
  'exile',
  'command',
]);

export const AdjustLifeSchema = z.object({
  playerId: z.string().min(1),
  delta: z.number().int(),
});

export const CommanderDamageSchema = z.object({
  targetPlayerId: z.string().min(1),
  sourceCommanderInstanceId: z.string().min(1),
  delta: z.number().int(),
});

export const SetPlayerCounterSchema = z.object({
  playerId: z.string().min(1),
  counterType: z.string().min(1),
  delta: z.number().int(),
});

export const SetCardCounterSchema = z.object({
  cardInstanceId: z.string().min(1),
  counterType: z.string().min(1),
  delta: z.number().int(),
});

export const MoveCardSchema = z.object({
  cardInstanceId: z.string().min(1),
  fromZone: ZoneTypeSchema,
  toZone: ZoneTypeSchema,
  toPlayerId: z.string().optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
      zIndex: z.number().optional().default(1),
    })
    .optional(),
  destinationIndex: z.number().int().optional(),
});

export const TapCardSchema = z.object({
  cardInstanceId: z.string().min(1),
  isTapped: z.boolean(),
});

export const FlipCardSchema = z.object({
  cardInstanceId: z.string().min(1),
  isFaceDown: z.boolean(),
});

export const DrawCardsSchema = z.object({
  playerId: z.string().min(1),
  count: z.number().int().positive().max(100),
});

export const RollDiceSchema = z.object({
  sides: z.number().int().positive().max(100),
});

export const ChatMessageSchema = z.object({
  message: z.string().min(1).max(500).trim(),
});

export const KickPlayerSchema = z.object({
  seat: z.number().int().min(0).max(5).optional(),
  playerId: z.string().optional(),
  reason: z.string().max(200).optional(),
});

export const TransferHostSchema = z.object({
  newHostSeat: z.number().int().min(0).max(5).optional(),
  newHostId: z.string().optional(),
});

export const SetLifeSchema = z.object({
  playerId: z.string().min(1),
  life: z.number().int(),
});

export const SetPlayerStatusSchema = z.object({
  playerId: z.string().min(1),
  isEliminated: z.boolean(),
  reason: z.string().max(200).optional(),
});

export const ActionEnvelopeSchema = z.object({
  type: z.enum([
    'ADJUST_LIFE',
    'SET_LIFE',
    'COMMANDER_DAMAGE',
    'SET_PLAYER_COUNTER',
    'SET_PLAYER_STATUS',
    'SET_CARD_COUNTER',
    'MOVE_CARD',
    'TAP_CARD',
    'UNTAP_ALL',
    'FLIP_CARD',
    'DRAW_CARDS',
    'MULLIGAN',
    'SHUFFLE_LIBRARY',
    'PASS_TURN',
    'SET_TURN_ORDER',
    'ROLL_DICE',
    'UNDO_LAST',
    'CHAT_MESSAGE',
    'LOAD_DECK',
    'KICK_PLAYER',
    'TRANSFER_HOST',
  ]),
  payload: z.unknown(),
  clientTimestamp: z.number().optional(),
});
