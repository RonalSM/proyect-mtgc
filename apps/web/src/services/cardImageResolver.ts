import type { CardDefinition } from '@mtgc/shared';

interface BatchRequestItem {
  cardName: string;
  size: 'small' | 'normal';
  resolve: (url: string | null) => void;
  reject: (err: any) => void;
}

/**
 * Resolvedor por lotes y caché en memoria para URLs de imágenes de cartas (Punto 4 - A.4).
 * Reemplaza las llamadas individuales GET /api/cards/search por el endpoint por lotes
 * POST /api/cards/resolve, delegando la cadena de respaldo al servidor y reintentando
 * únicamente ante fallos de red.
 */
class CardImageResolver {
  private cache: Map<string, string | null> = new Map();
  private inFlight: Map<string, Promise<string | null>> = new Map();
  private batchQueue: Map<string, BatchRequestItem[]> = new Map();
  private batchScheduled: Set<string> = new Set();

  /**
   * Obtiene sincrónicamente una URL previamente resuelta desde la caché en memoria
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
   * Resuelve de forma asíncrona la URL de una carta mediante POST /api/cards/resolve
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

    const promise = new Promise<string | null>((resolve, reject) => {
      const queueKey = lang;
      if (!this.batchQueue.has(queueKey)) {
        this.batchQueue.set(queueKey, []);
      }

      this.batchQueue.get(queueKey)!.push({
        cardName: trimmed,
        size,
        resolve,
        reject,
      });

      if (!this.batchScheduled.has(queueKey)) {
        this.batchScheduled.add(queueKey);
        queueMicrotask(() => this.flushBatch(queueKey));
      }
    });

    this.inFlight.set(key, promise);
    promise.finally(() => {
      this.inFlight.delete(key);
    });

    return promise;
  }

  /**
   * Ejecuta la resolución por lotes enviando un único POST /api/cards/resolve
   */
  private async flushBatch(lang: string): Promise<void> {
    this.batchScheduled.delete(lang);
    const items = this.batchQueue.get(lang) || [];
    this.batchQueue.delete(lang);

    if (items.length === 0) return;

    const names = Array.from(new Set(items.map(i => i.cardName)));

    let resultData: {
      cards: CardDefinition[];
      byQuery: Record<string, CardDefinition | null>;
    } | null = null;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const res = await fetch('/api/cards/resolve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ names, lang }),
        });

        if (res.ok) {
          resultData = await res.json();
          break;
        } else {
          // Si el servidor responde con error de cliente/servidor (ej. 400/404), no reintentar
          break;
        }
      } catch (networkErr) {
        // El cliente SOLO reintenta ante fallos reales de red (Punto 4)
        if (attempts >= maxAttempts) {
          break;
        }
        await new Promise(r => setTimeout(r, attempts * 100));
      }
    }

    const byQuery = resultData?.byQuery || {};

    for (const item of items) {
      const trimmed = item.cardName.trim();
      const lower = trimmed.toLowerCase();
      const cardDef = byQuery[trimmed] || byQuery[lower] || null;

      let targetUrl: string | null = null;
      if (cardDef) {
        // Soporte para cartas DFC con caras si la raíz no tiene URLs de imagen
        const faceFront = cardDef.faces?.[0];
        targetUrl =
          item.size === 'small'
            ? cardDef.imageUrlSmall ||
              cardDef.imageUrlNormal ||
              faceFront?.imageUrlSmall ||
              faceFront?.imageUrlNormal ||
              null
            : cardDef.imageUrlNormal ||
              cardDef.imageUrlSmall ||
              faceFront?.imageUrlNormal ||
              faceFront?.imageUrlSmall ||
              null;
      }

      const key = `${lower}_${item.size}_${lang}`;
      this.cache.set(key, targetUrl);
      item.resolve(targetUrl);
    }
  }

  public invalidate(cardName: string, size?: 'small' | 'normal', lang?: 'es' | 'en'): void {
    if (!cardName) return;
    const lower = cardName.trim().toLowerCase();
    if (size && lang) {
      this.cache.delete(`${lower}_${size}_${lang}`);
    } else {
      for (const k of Array.from(this.cache.keys())) {
        if (k.startsWith(`${lower}_`)) {
          this.cache.delete(k);
        }
      }
    }
  }

  /**
   * Resuelve directamente una lista de nombres de cartas por lote
   */
  public async resolveBatch(
    names: string[],
    lang: 'es' | 'en' = 'es',
  ): Promise<Record<string, CardDefinition | null>> {
    if (!names || names.length === 0) return {};

    try {
      const res = await fetch('/api/cards/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, lang }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.byQuery || {};
      }
    } catch {
      // Fallback
    }

    return {};
  }
}

export const cardImageResolver = new CardImageResolver();
