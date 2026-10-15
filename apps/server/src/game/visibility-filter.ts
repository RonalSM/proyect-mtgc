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
 */
export function filterRoomStateForPlayer(
  state: RoomState,
  targetPlayerId: string | null, // null if spectator
): RoomState {
  const filteredPlayerZones: Record<string, PlayerZones> = {};

  for (const [playerId, zones] of Object.entries(state.playerZones)) {
    const isOwner = targetPlayerId === playerId;

    // 1. Filter Hand: only owner sees full card data
    const filteredHand: CardInstance[] = zones.hand.map(card => {
      if (isOwner) return card;
      return {
        ...card,
        definition: MASKED_CARD_DEFINITION,
      };
    });

    // 2. Filter Library: only owner sees their library cards (REQ-9.3, Punto 7)
    const filteredLibrary: CardInstance[] = zones.library.map(card => {
      if (isOwner) return card;
      return {
        ...card,
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
