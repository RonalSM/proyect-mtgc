export interface PlayerCounters {
  poison: number;
  energy: number;
  experience: number;
  commanderTax: number;
  custom: Record<string, number>;
}

export interface PlayerState {
  id: string;
  name: string;
  seatNumber: number; // 0 to 5 (2-6 players)
  isHost: boolean;
  isSpectator: boolean;
  isConnected: boolean;
  life: number;
  commanderDamage: Record<string, number>; // sourceCommanderCardId -> damage dealt
  counters: PlayerCounters;
  isEliminated: boolean;
  eliminationReason?: 'life' | 'commander_damage' | 'poison' | 'conceded' | 'other';
  deckLoaded: boolean;
  handCount: number;
  libraryCount: number;
  graveyardCount: number;
  exileCount: number;
}
