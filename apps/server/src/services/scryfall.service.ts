import { CardDefinition, CardColor } from '@mtgc/shared';

interface ScryfallCardFace {
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  artist?: string;
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    art_crop?: string;
  };
}

interface ScryfallCardRaw {
  id: string;
  oracle_id?: string;
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  set?: string;
  set_name?: string;
  rarity?: string;
  collector_number?: string;
  artist?: string;
  card_faces?: ScryfallCardFace[];
  image_uris?: {
    small?: string;
    normal?: string;
    large?: string;
    art_crop?: string;
  };
  layout?: string;
  legalities?: Record<string, string>;
}

export class ScryfallService {
  private readonly baseUrl: string;
  private readonly userAgent: string;
  private lastRequestTime = 0;
  private readonly minRequestIntervalMs = 75; // 75ms delay to stay well within Scryfall's 50-100ms rule
  private queue: Promise<void> = Promise.resolve();

  constructor(
    baseUrl = process.env.SCRYFALL_API_URL || 'https://api.scryfall.com',
    userAgent = process.env.SCRYFALL_USER_AGENT ||
      'MTGCommanderVirtualTable/1.0.0 (admin@mtgc.local)',
  ) {
    this.baseUrl = baseUrl;
    this.userAgent = userAgent;
  }

  /**
   * Internal rate-limited fetch with exponential backoff on 429/5xx.
   */
  private async rateLimitedFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Chain onto queue to guarantee serialized execution with inter-request spacing
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue
        .then(async () => {
          const now = Date.now();
          const timeSinceLast = now - this.lastRequestTime;
          if (timeSinceLast < this.minRequestIntervalMs) {
            await new Promise(r => setTimeout(r, this.minRequestIntervalMs - timeSinceLast));
          }

          const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
          const headers: Record<string, string> = {
            'User-Agent': this.userAgent,
            Accept: 'application/json;q=0.9,*/*;q=0.8',
            ...((options.headers as Record<string, string>) || {}),
          };

          let attempts = 0;
          const maxAttempts = 3;
          let delayMs = 500;

          while (attempts < maxAttempts) {
            attempts++;
            try {
              this.lastRequestTime = Date.now();
              const response = await fetch(url, { ...options, headers });

              if (response.status === 429 || response.status >= 500) {
                if (attempts < maxAttempts) {
                  console.warn(
                    `[Scryfall] Rate limited or server error (${response.status}). Retrying in ${delayMs}ms...`,
                  );
                  await new Promise(r => setTimeout(r, delayMs));
                  delayMs *= 2;
                  continue;
                }
              }

              if (!response.ok) {
                const errBody = await response.text();
                throw new Error(`Scryfall API error (${response.status}): ${errBody}`);
              }

              const data = (await response.json()) as T;
              resolve(data);
              return;
            } catch (err) {
              if (attempts >= maxAttempts) {
                reject(err);
                return;
              }
              await new Promise(r => setTimeout(r, delayMs));
              delayMs *= 2;
            }
          }
        })
        .catch(reject);
    });
  }

  /**
   * Transform Scryfall raw card into standard CardDefinition
   */
  public toCardDefinition(raw: ScryfallCardRaw): CardDefinition {
    const hasFaceImages = !!(raw.card_faces && raw.card_faces.some(f => f.image_uris));
    const isTwoFaced = hasFaceImages || !!(raw.card_faces && raw.card_faces.length > 1 && !raw.image_uris);
    const primaryFace = isTwoFaced ? raw.card_faces![0] : undefined;

    const imageUrlSmall = raw.image_uris?.small || primaryFace?.image_uris?.small;
    const imageUrlNormal = raw.image_uris?.normal || primaryFace?.image_uris?.normal;
    const imageUrlLarge = raw.image_uris?.large || primaryFace?.image_uris?.large;
    const imageUrlArtCrop = raw.image_uris?.art_crop || primaryFace?.image_uris?.art_crop;

    return {
      scryfallId: raw.id,
      oracleId: raw.oracle_id,
      name: raw.name,
      manaCost: raw.mana_cost || primaryFace?.mana_cost,
      cmc: raw.cmc ?? 0,
      typeLine: raw.type_line || primaryFace?.type_line || 'Card',
      oracleText: raw.oracle_text || primaryFace?.oracle_text,
      colors: (raw.colors || []) as CardColor[],
      colorIdentity: (raw.color_identity || []) as CardColor[],
      legalities: raw.legalities,
      power: raw.power || primaryFace?.power,
      toughness: raw.toughness || primaryFace?.toughness,
      loyalty: raw.loyalty || primaryFace?.loyalty,
      set: raw.set,
      setName: raw.set_name,
      rarity: raw.rarity,
      collectorNumber: raw.collector_number,
      artist: raw.artist || primaryFace?.artist,
      copyright: '© Wizards of the Coast',
      imageUrlSmall,
      imageUrlNormal,
      imageUrlLarge,
      imageUrlArtCrop,
      isTwoFaced,
      faces: isTwoFaced
        ? raw.card_faces?.map(f => ({
            name: f.name,
            manaCost: f.mana_cost,
            typeLine: f.type_line || '',
            oracleText: f.oracle_text,
            power: f.power,
            toughness: f.toughness,
            loyalty: f.loyalty,
            artist: f.artist || raw.artist,
            imageUrlSmall: f.image_uris?.small || raw.image_uris?.small,
            imageUrlNormal: f.image_uris?.normal || raw.image_uris?.normal,
            imageUrlLarge: f.image_uris?.large || raw.image_uris?.large,
            imageUrlArtCrop: f.image_uris?.art_crop || raw.image_uris?.art_crop,
          }))
        : undefined,
    };
  }

  /**
   * Search card by exact or fuzzy name
   */
  public async getCardNamed(name: string, exact = false): Promise<CardDefinition> {
    const query = exact
      ? `/cards/named?exact=${encodeURIComponent(name)}`
      : `/cards/named?fuzzy=${encodeURIComponent(name)}`;

    const raw = await this.rateLimitedFetch<ScryfallCardRaw>(query);
    return this.toCardDefinition(raw);
  }

  /**
   * Autocomplete card names based on partial prefix
   */
  public async autocomplete(prefix: string): Promise<string[]> {
    if (!prefix || prefix.trim().length < 2) return [];
    const res = await this.rateLimitedFetch<{ data: string[] }>(
      `/cards/autocomplete?q=${encodeURIComponent(prefix.trim())}`,
    );
    return res.data || [];
  }

  /**
   * Fetch cards in batch via Scryfall Collection API (up to 75 identifiers per chunk)
   */
  public async getCollection(identifiers: Array<{ name?: string; id?: string }>): Promise<{
    found: CardDefinition[];
    notFound: Array<{ name?: string; id?: string }>;
  }> {
    const CHUNK_SIZE = 75;
    const found: CardDefinition[] = [];
    const notFound: Array<{ name?: string; id?: string }> = [];

    for (let i = 0; i < identifiers.length; i += CHUNK_SIZE) {
      const chunk = identifiers.slice(i, i + CHUNK_SIZE);
      const res = await this.rateLimitedFetch<{
        data: ScryfallCardRaw[];
        not_found: Array<{ name?: string; id?: string }>;
      }>('/cards/collection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifiers: chunk }),
      });

      if (res.data) {
        found.push(...res.data.map(raw => this.toCardDefinition(raw)));
      }
      if (res.not_found) {
        notFound.push(...res.not_found);
      }
    }

    return { found, notFound };
  }
}

export const scryfallService = new ScryfallService();
