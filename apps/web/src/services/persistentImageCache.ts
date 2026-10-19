/**
 * Persistent browser Cache API manager for Scryfall card images.
 * Stores downloaded card images locally in the user's browser (Cache API)
 * so subsequent games with the same deck load instantly with 0 network calls.
 * 
 * STRICT COMPLIANCE:
 * - No images are stored, mirrored, or proxied on the server.
 * - All caching is 100% local in the client browser's Cache API ('mtgc-card-images-v1').
 */

const CACHE_NAME = 'mtgc-card-images-v1';

class PersistentImageCache {
  private blobUrlMap: Map<string, string> = new Map();
  private isAvailable: boolean;

  constructor() {
    this.isAvailable = typeof window !== 'undefined' && 'caches' in window;
  }

  /**
   * Check if a card image URL exists in persistent browser cache
   */
  public async has(url: string): Promise<boolean> {
    if (!this.isAvailable || !url) return false;
    try {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(url);
      return !!match;
    } catch {
      return false;
    }
  }

  /**
   * Get a cached blob: URL for the given Scryfall image URL if available
   */
  public async getBlobUrl(url: string): Promise<string | null> {
    if (!url) return null;
    if (this.blobUrlMap.has(url)) {
      return this.blobUrlMap.get(url)!;
    }

    if (!this.isAvailable) return null;

    try {
      const cache = await caches.open(CACHE_NAME);
      const match = await cache.match(url);
      if (match) {
        const blob = await match.blob();
        const blobUrl = URL.createObjectURL(blob);
        this.blobUrlMap.set(url, blobUrl);
        return blobUrl;
      }
    } catch (err) {
      console.warn('[PersistentImageCache] Failed to retrieve from cache:', err);
    }

    return null;
  }

  /**
   * Fetch an image, store it in Cache API, and return its blob URL
   */
  public async fetchAndCache(url: string, signal?: AbortSignal): Promise<string> {
    if (!url) throw new Error('Missing URL');

    // 1. Check existing blob map
    if (this.blobUrlMap.has(url)) {
      return this.blobUrlMap.get(url)!;
    }

    // 2. Check Cache API
    if (this.isAvailable) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const match = await cache.match(url);
        if (match) {
          const blob = await match.blob();
          const blobUrl = URL.createObjectURL(blob);
          this.blobUrlMap.set(url, blobUrl);
          return blobUrl;
        }
      } catch {
        // Fall through to network fetch
      }
    }

    // 3. Network fetch
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} when fetching image: ${url}`);
    }

    // 4. Store in Cache API
    if (this.isAvailable) {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(url, response.clone());
      } catch (err) {
        console.warn('[PersistentImageCache] Failed to put into cache:', err);
      }
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    this.blobUrlMap.set(url, blobUrl);
    return blobUrl;
  }

  /**
   * Clear persistent cache if requested by user
   */
  public async clear(): Promise<boolean> {
    for (const blobUrl of this.blobUrlMap.values()) {
      URL.revokeObjectURL(blobUrl);
    }
    this.blobUrlMap.clear();

    if (!this.isAvailable) return false;
    try {
      return await caches.delete(CACHE_NAME);
    } catch {
      return false;
    }
  }
}

export const persistentImageCache = new PersistentImageCache();

if (typeof window !== 'undefined') {
  (window as any).__persistentImageCache = persistentImageCache;
}
