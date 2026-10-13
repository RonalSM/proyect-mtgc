import { z } from 'zod';

export const RoomCodeSchema = z
  .string()
  .trim()
  .length(6)
  .regex(/^[A-Za-z0-9]{6}$/, 'El código de sala debe tener exactamente 6 caracteres alfanuméricos')
  .transform(val => val.toUpperCase());

export const CreateRoomInputSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(40, 'Máximo 40 caracteres').trim(),
  hostName: z.string().min(1, 'Tu apodo es obligatorio').max(25, 'Máximo 25 caracteres').trim(),
  startingLife: z.number().int().min(1).max(100).default(40),
  maxPlayers: z.number().int().min(2).max(6).default(4),
  turnTimerSeconds: z.number().int().min(10).max(3600).optional(),
  allowSpectators: z.boolean().default(true),
});

export const JoinRoomInputSchema = z.object({
  code: RoomCodeSchema,
  playerName: z.string().min(1, 'Tu apodo es obligatorio').max(25, 'Máximo 25 caracteres').trim(),
  isSpectator: z.boolean().default(false),
  seatNumber: z.number().int().min(0).max(5).optional(),
});
