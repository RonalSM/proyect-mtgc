import { RoomState, CardInstance, PlayerZones } from '@mtgc/shared';

const MASKED_CARD_DEFINITION = {
  scryfallId: 'hidden_card',
  name: 'Carta Oculta',
  cmc: 0,
  typeLine: 'Card',
  colors: [],
  colorIdentity: [],
};

/**
 * Masks hidden card information (opponent hands, hidden library cards)
 * before sending to a specific player or spectator.
 * Prevents cheating via browser devtools / network inspection.
 * Supports persistent card revealing in hand (revealedTo, Punto 1).
 */
export function filterRoomStateForPlayer(
  state: RoomState,
  targetPlayerId: string | null, // null if spectator
): RoomState {
  const filteredPlayerZones: Record<string, PlayerZones> = {};

  for (const [playerId, zones] of Object.entries(state.playerZones)) {
    const isOwner = targetPlayerId === playerId;

    // 1. Filter Hand: owner sees full card data; recipients of revealedTo see full card; non-recipients get masked (Punto 1)
    const filteredHand: CardInstance[] = zones.hand.map(card => {
      const isRevealedToAll =
        card.revealedTo === 'all' ||
        (Array.isArray(card.revealedTo) && card.revealedTo.includes('all'));
      const isRevealedToTarget =
        !!targetPlayerId &&
        Array.isArray(card.revealedTo) &&
        card.revealedTo.includes(targetPlayerId);
      const canSee = isOwner || isRevealedToAll || isRevealedToTarget;

      if (canSee) {
        return { ...card };
      }

      // Non-recipients: completely masked and revealedTo stripped
      const { revealedTo, ...masked } = card;
      return {
        ...masked,
        definition: MASKED_CARD_DEFINITION,
      };
    });

    // 2. Filter Library: only owner sees their library cards (REQ-9.3, Punto 7), unless explicitly revealed (Punto 1, REQ-22)
    const filteredLibrary: CardInstance[] = zones.library.map(card => {
      const isRevealedToAll =
        card.revealedTo === 'all' ||
        (Array.isArray(card.revealedTo) && card.revealedTo.includes('all'));
      const isRevealedToTarget =
        !!targetPlayerId &&
        Array.isArray(card.revealedTo) &&
        card.revealedTo.includes(targetPlayerId);
      const canSee = isOwner || isRevealedToAll || isRevealedToTarget;

      if (canSee) {
        return { ...card };
      }

      const { revealedTo, ...masked } = card;
      return {
        ...masked,
        definition: MASKED_CARD_DEFINITION,
      };
    });

    filteredPlayerZones[playerId] = {
      battlefield: zones.battlefield,
      graveyard: zones.graveyard,
      exile: zones.exile,
      command: zones.command,
      hand: filteredHand,
      library: filteredLibrary,
    };
  }

  return {
    ...state,
    playerZones: filteredPlayerZones,
  };
}
