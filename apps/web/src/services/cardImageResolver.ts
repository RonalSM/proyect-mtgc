/**
 * Single-flight in-memory cache and resolver for card image URLs.
 * Ensures zero direct calls to api.scryfall.com/cards/named, preventing HTTP 429 floods.
 * All image lookups go through our server backend (/api/cards/search) which prioritizes
 * local bulk data in PostgreSQL.
 */
class CardImageResolver {
  private cache: Map<string, string | null> = new Map();
  private inFlight: Map<string, Promise<string | null>> = new Map();

  /**
   * Synchronously get a previously cached image URL for a card name with language support
   */
  public getCached(
    cardName: string,
    size: 'small' | 'normal' = 'normal',
    lang: 'es' | 'en' = 'es',
  ): string | null {
    if (!cardName) return null;
    const key = `${cardName.trim().toLowerCase()}_${size}_${lang}`;
    return this.cache.get(key) || null;
  }

  /**
   * Asynchronously resolve image URL via backend with deduplication and in-memory cache
   */
  public async resolve(
    cardName: string,
    size: 'small' | 'normal' = 'normal',
    lang: 'es' | 'en' = 'es',
  ): Promise<string | null> {
    if (!cardName) return null;
    const trimmed = cardName.trim();
    const key = `${trimmed.toLowerCase()}_${size}_${lang}`;

    if (this.cache.has(key)) {
      return this.cache.get(key) || null;
    }

    if (this.inFlight.has(key)) {
      return this.inFlight.get(key)!;
    }

    const promise = (async () => {
      try {
        const res = await fetch(
          `/api/cards/search?name=${encodeURIComponent(trimmed)}&exact=true&lang=${lang}`,
        );
        if (res.ok) {
          const cardDef = await res.json();
          let targetUrl: string | null = null;
          if (lang === 'es' && cardDef.locales?.es) {
            const es = cardDef.locales.es;
            targetUrl =
              size === 'small'
                ? es.imageUrlSmall || es.imageUrlNormal || null
                : es.imageUrlNormal || es.imageUrlSmall || null;
          }
          if (!targetUrl) {
            targetUrl =
              size === 'small'
                ? cardDef.imageUrlSmall || cardDef.imageUrlNormal || null
                : cardDef.imageUrlNormal || cardDef.imageUrlSmall || null;
          }

          this.cache.set(key, targetUrl);
          return targetUrl;
        } else {
          this.cache.set(key, null);
          return null;
        }
      } catch {
        this.cache.set(key, null);
        return null;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }
}

export const cardImageResolver = new CardImageResolver();
