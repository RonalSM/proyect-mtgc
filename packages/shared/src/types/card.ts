export type CardColor = 'W' | 'U' | 'B' | 'R' | 'G';

export interface CardFace {
  name: string;
  manaCost?: string;
  typeLine: string;
  oracleText?: string;
  power?: string;
  toughness?: string;
  imageUrlSmall?: string;
  imageUrlNormal?: string;
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
  power?: string;
  toughness?: string;
  imageUrlSmall?: string;
  imageUrlNormal?: string;
  imageUrlArtCrop?: string;
  isTwoFaced?: boolean;
  faces?: CardFace[];
}

export interface CardInstance {
  instanceId: string; // Unique GUID for this card in the active game
  definition: CardDefinition;
  ownerId: string;
  controllerId: string;
  isCommander: boolean;
  isTapped: boolean;
  isFaceDown: boolean;
  rotation: number; // 0, 90 (tap), 180, 270
  counters: Record<string, number>; // e.g., '+1/+1': 2, 'charge': 1
  position?: {
    x: number;
    y: number;
    zIndex: number;
  };
}
