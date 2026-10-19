import type { RoomState, CardInstance } from '@mtgc/shared';
import type { ViewFraming } from '../components/BattlefieldCanvas';

export function getPlayerFraming(playerId: string, roomState: RoomState): ViewFraming {
  const allSeated = Object.values(roomState.players).filter(p => !p.isSpectator);
  const totalPlayers = Math.max(2, allSeated.length);
  const isTwoPlayerMode = totalPlayers === 2;
  const cols = isTwoPlayerMode ? 2 : Math.min(3, Math.max(2, Math.ceil(totalPlayers / 2)));
  const seatedPlayers = [...allSeated].sort((a, b) => (a.seatNumber ?? 0) - (b.seatNumber ?? 0));

  const playerIdx = seatedPlayers.findIndex(p => p.id === playerId);
  if (playerIdx === -1) {
    return { xMin: 0, yMin: 0, width: 1, height: 1, isExpanded: false };
  }

  if (isTwoPlayerMode) {
    const col = playerIdx === 0 ? 0 : 1;
    return {
      xMin: col * 0.5,
      yMin: 0,
      width: 0.5,
      height: 1.0,
      isExpanded: true,
    };
  }

  const row = playerIdx < cols ? 0 : 1;
  const col = playerIdx < cols ? playerIdx : playerIdx - cols;

  return {
    xMin: col / cols,
    yMin: row === 0 ? 0 : 0.5,
    width: 1 / cols,
    height: 0.5,
    isExpanded: true,
  };
}

export function getPlayerBattlefieldCascadePosition(
  playerId: string,
  roomState: RoomState,
  battlefieldCards?: CardInstance[],
): { x: number; y: number } {
  const framing = getPlayerFraming(playerId, roomState);
  const allSeated = Object.values(roomState.players).filter(p => !p.isSpectator);
  const totalPlayers = Math.max(2, allSeated.length);
  const isTwoPlayerMode = totalPlayers === 2;

  // Altura del dock inferior normalizada en viewport 1080p:
  // En 2 jugadores (1080p completo): dock ~162px => 0.15
  // En 4 y 6 jugadores (celda 540px): dock ~135px => 0.125
  const dockHeightNorm = isTwoPlayerMode ? 0.15 : 0.125;
  const playableHeight = framing.height - dockHeightNorm;

  const centerX = framing.xMin + framing.width * 0.5;
  const centerY = framing.yMin + playableHeight * 0.5;

  // Normalized card dimensions: ~0.045 x 0.095
  const baseX = centerX - 0.0225;
  const baseY = centerY - 0.0475;

  const playerBattlefield = battlefieldCards
    ? battlefieldCards.filter(c => c.holderId === playerId || (!c.holderId && c.ownerId === playerId))
    : (roomState.playerZones[playerId]?.battlefield ?? []);
  const cascadeIndex = playerBattlefield.length % 5;
  const cascadeOffset = cascadeIndex * 0.015;

  const minX = framing.xMin + 0.01;
  const maxX = framing.xMin + framing.width - 0.055;
  const minY = framing.yMin + 0.01;
  const maxY = framing.yMin + playableHeight - 0.06;

  const x = Math.max(minX, Math.min(maxX, baseX + cascadeOffset));
  const y = Math.max(minY, Math.min(maxY, baseY + cascadeOffset));

  return { x, y };
}
