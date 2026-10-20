export type CardColor = 'W' | 'U' | 'B' | 'R' | 'G';

export interface CardRuling {
  publishedAt: string;
  source: string;
  comment: string;
}

export interface CardFace {
  name: string;
  manaCost?: string;
  typeLine: string;
  oracleText?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  artist?: string;
  imageUrlSmall?: string;
  imageUrlNormal?: string;
  imageUrlLarge?: string;
  imageUrlArtCrop?: string;
}

export interface CardDefinition {
  scryfallId: string;
  oracleId?: string;
  name: string;
  manaCost?: string;
  cmc: number;
  typeLine: string;
  oracleText?: string;
  colors: CardColor[];
  colorIdentity: CardColor[];
  legalities?: Record<string, string>;
  power?: string;
  toughness?: string;
  loyalty?: string;
  set?: string;
  setName?: string;
  rarity?: string;
  collectorNumber?: string;
  artist?: string;
  copyright?: string;
  rulings?: CardRuling[];
  imageUrlSmall?: string;
  imageUrlNormal?: string;
  imageUrlLarge?: string;
  imageUrlArtCrop?: string;
  isTwoFaced?: boolean;
  faces?: CardFace[];
}

export interface CardInstance {
  instanceId: string; // Unique GUID for this card in the active game
  definition: CardDefinition;
  ownerId: string; // Inmutable: jugador de cuya zona salió, o creador del token
  controllerId: string;
  holderId?: string; // Titular temporal: jugador cuya división contiene la carta al 100% (oculto en UI)
  isCommander: boolean;
  isTapped: boolean;
  isFaceDown: boolean;
  rotation: number; // 0, 90 (tap), 180, 270
  counters: Record<string, number>; // e.g., '+1/+1': 2, 'charge': 1
  revealedTo?: string[] | 'all'; // Jugadores a quienes esta carta de la mano ha sido revelada de forma persistente (Punto 1)
  position?: {
    x: number;
    y: number;
    zIndex: number;
  };
}
