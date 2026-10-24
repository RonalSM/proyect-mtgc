import { z } from 'zod';
import type { CardColor } from '../types/card.js';

export const ZoneTypeSchema = z.enum([
  'library',
  'hand',
  'battlefield',
  'graveyard',
  'exile',
  'command',
]);

export const AdjustLifeSchema = z.object({
  playerId: z.string().min(1).optional(),
  delta: z.number().int(),
});

export const CommanderDamageSchema = z.object({
  targetPlayerId: z.string().min(1),
  sourceCommanderInstanceId: z.string().min(1),
  delta: z.number().int(),
});

export const SetPlayerCounterSchema = z.object({
  playerId: z.string().min(1).optional(),
  counterType: z.string().min(1),
  delta: z.number().int(),
});

export const SetCardCounterSchema = z.object({
  cardInstanceId: z.string().min(1),
  counterType: z.string().min(1),
  delta: z.number().int().optional(),
  count: z.number().int().min(0).optional(),
});

export const ToggleCardKeywordSchema = z.object({
  cardInstanceId: z.string().min(1),
  keyword: z.string().min(1),
  active: z.boolean().optional(),
});

export const SetCardPTSchema = z.object({
  cardInstanceId: z.string().min(1),
  basePower: z.number().int().optional().nullable(),
  baseToughness: z.number().int().optional().nullable(),
  plusCounters: z.number().int().min(0).optional(),
  minusCounters: z.number().int().min(0).optional(),
});

export const MoveCardSchema = z.object({
  cardInstanceId: z.string().min(1),
  fromZone: ZoneTypeSchema,
  toZone: ZoneTypeSchema,
  fromPlayerId: z.string().optional(),
  toPlayerId: z.string().optional(),
  holderId: z.string().optional().nullable(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
      zIndex: z.number().optional().default(1),
    })
    .optional(),
  destinationIndex: z.number().int().optional(),
  randomPosition: z.boolean().optional(),
  isRandom: z.boolean().optional(),
});

export const TapCardSchema = z.object({
  cardInstanceId: z.string().min(1),
  isTapped: z.boolean(),
});

export const FlipCardSchema = z.object({
  cardInstanceId: z.string().min(1),
  isFaceDown: z.boolean().optional(),
  transformFace: z.boolean().optional(), // Si true, alterna la cara activa (Punto 15)
});

export const CloneTokenSchema = z.object({
  cardInstanceId: z.string().min(1),
  count: z.number().int().positive().default(1),
});

export const CreateTokenSchema = z.object({
  tokenDefinition: z.object({
    scryfallId: z.string().default('token'),
    name: z.string().min(1),
    typeLine: z.string(),
    manaCost: z.string().optional(),
    cmc: z.number().default(0),
    oracleText: z.string().optional(),
    colors: z.array(z.string()).default([]) as unknown as z.ZodType<CardColor[]>,
    colorIdentity: z.array(z.string()).default([]) as unknown as z.ZodType<CardColor[]>,
    power: z.string().optional(),
    toughness: z.string().optional(),
    loyalty: z.string().optional(),
    artist: z.string().optional(),
    copyright: z.string().optional(),
    imageUrlNormal: z.string().optional(),
    imageUrlSmall: z.string().optional(),
    imageUrlLarge: z.string().optional(),
    imageUrlArtCrop: z.string().optional(),
  }),
  targetPlayerId: z.string().optional(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
});

export const DrawCardsSchema = z.object({
  playerId: z.string().min(1).optional(),
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
  playerId: z.string().min(1).optional(),
  life: z.number().int(),
});

export const SetPlayerStatusSchema = z.object({
  playerId: z.string().min(1).optional(),
  isEliminated: z.boolean(),
  reason: z.string().max(200).optional(),
});

export const ConfirmUndoSchema = z.object({
  proposalId: z.string().min(1),
  approved: z.boolean(),
});

export const UpdateRoomSettingsSchema = z.object({
  turnTimerSeconds: z.number().int().min(10).max(3600).optional(),
  allowSpectators: z.boolean().optional(),
});

export const SetTurnOrderSchema = z.object({
  turnOrder: z.array(z.string().min(1)).min(2).max(6),
});

export const SelectDeckSchema = z.object({
  deckId: z.string().optional(),
  deckName: z.string().min(1).max(100),
  commanderName: z.string().min(1).max(100),
  commanderImageUrl: z.string().url().optional().or(z.literal('')),
  commanderCards: z.array(z.any()).min(1),
  maindeckCards: z.array(z.any()).min(1),
  warnings: z.array(z.string()).optional(),
});

export const SetReadySchema = z.object({
  isReady: z.boolean(),
});

export const StartGameSchema = z.object({}).passthrough();

export const RollD20InitiativeSchema = z.object({}).passthrough();

export const SetPlaymatSchema = z.object({
  playmatUrl: z.string().max(1000),
});

export const CardDragMoveSchema = z.object({
  cardInstanceId: z.string().min(1),
  isDragging: z.boolean(),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
  cardDefinition: z.any().optional(),
  fromZone: ZoneTypeSchema.optional(),
  isTapped: z.boolean().optional(),
});

export const MulliganTakeSchema = z.object({});

export const MulliganKeepSchema = z.object({
  bottomCardIds: z.array(z.string()).optional(),
});

export const MulliganForceDecisionSchema = z.object({
  targetPlayerId: z.string(),
});

export const RevealCardSchema = z.object({
  cardInstanceId: z.string().min(1),
  fromZone: ZoneTypeSchema.optional(),
  targetPlayerId: z.string().optional(),
});

export const UnrevealCardSchema = z.object({
  cardInstanceId: z.string().min(1),
  fromZone: ZoneTypeSchema.optional(),
});

export const ActionEnvelopeSchema = z.object({
  type: z.enum([
    'ADJUST_LIFE',
    'SET_LIFE',
    'COMMANDER_DAMAGE',
    'SET_PLAYER_COUNTER',
    'SET_PLAYER_STATUS',
    'SET_CARD_COUNTER',
    'SET_CARD_PT',
    'TOGGLE_CARD_KEYWORD',
    'MOVE_CARD',
    'TAP_CARD',
    'UNTAP_ALL',
    'FLIP_CARD',
    'CLONE_TOKEN',
    'CREATE_TOKEN',
    'DRAW_CARDS',
    'MULLIGAN',
    'MULLIGAN_TAKE',
    'MULLIGAN_KEEP',
    'MULLIGAN_FORCE_DECISION',
    'SHUFFLE_LIBRARY',
    'PASS_TURN',
    'SET_TURN_ORDER',
    'ROLL_DICE',
    'UNDO_LAST',
    'CONFIRM_UNDO',
    'CHAT_MESSAGE',
    'LOAD_DECK',
    'KICK_PLAYER',
    'TRANSFER_HOST',
    'UPDATE_ROOM_SETTINGS',
    'SELECT_DECK',
    'SET_READY',
    'START_GAME',
    'ROLL_D20_INITIATIVE',
    'SET_PLAYMAT',
    'REVEAL_CARD',
    'UNREVEAL_CARD',
    'CARD_DRAG_MOVE',
  ]),
  payload: z.unknown(),
  clientTimestamp: z.number().optional(),
});
