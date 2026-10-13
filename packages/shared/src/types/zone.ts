export type ZoneType = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'command';

export interface ZoneCardLocation {
  cardInstanceId: string;
  zone: ZoneType;
  ownerId: string;
  orderIndex?: number;
}
