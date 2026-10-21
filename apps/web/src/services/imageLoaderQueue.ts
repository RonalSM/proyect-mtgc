/**
 * Concurrency-limited image loader queue with exponential backoff, timeouts, and observable progress.
 * Concurrency limited to 6-8 simultaneous requests to respect browser limits and Scryfall CDN.
 */
import { persistentImageCache } from './persistentImageCache';

export type ImageLoadStatus = 'idle' | 'pending' | 'loading' | 'loaded' | 'failed';

export interface ImageQueueStats {
  total: number;
  loaded: number;
  failed: number;
  inFlight: number;
  pending: number;
}

export type ImageQueueListener = (stats: ImageQueueStats) => void;

interface QueueItem {
  url: string;
  retries: number;
  priority: number; // Higher number = higher priority
  resolve: (success: boolean) => void;
  reject: (err: any) => void;
}

class ImageLoaderQueue {
  private maxConcurrency = 6;
  private maxRetries = 3;
  private timeoutMs = 8000;
  private activeCount = 0;

  private queue: QueueItem[] = [];
  private statuses: Map<string, ImageLoadStatus> = new Map();
  private retryCounts: Map<string, number> = new Map();
  private failedUrls: Set<string> = new Set();
  private loadedUrls: Set<string> = new Set();
  private inFlightUrls: Set<string> = new Set();
  private listeners: Set<ImageQueueListener> = new Set();

  /**
   * Check if a URL has already been successfully loaded
   */
  public isLoaded(url: string): boolean {
    return this.loadedUrls.has(url);
  }

  /**
   * Check if a URL has exhausted retries and failed
   */
  public isFailed(url: string): boolean {
    return this.failedUrls.has(url);
  }

  /**
   * Get current status of a given image URL
   */
  public getStatus(url: string): ImageLoadStatus {
    if (this.loadedUrls.has(url)) return 'loaded';
    if (this.failedUrls.has(url)) return 'failed';
    return this.statuses.get(url) || 'idle';
  }

  /**
   * Get number of retries attempted for a URL
   */
  public getRetryCount(url: string): number {
    return this.retryCounts.get(url) || 0;
  }

  /**
   * Get list of failed URLs
   */
  public getFailedUrls(): string[] {
    return Array.from(this.failedUrls);
  }

  /**
   * Get list of currently in-flight URLs
   */
  public getInFlightUrls(): string[] {
    return Array.from(this.inFlightUrls);
  }

  /**
   * Get global stats for UI counters ("Cargando N de M")
   */
  public getStats(): ImageQueueStats {
    const total =
      this.loadedUrls.size + this.failedUrls.size + this.queue.length + this.activeCount;
    return {
      total,
      loaded: this.loadedUrls.size,
      failed: this.failedUrls.size,
      inFlight: this.activeCount,
      pending: this.queue.length,
    };
  }

  /**
   * Subscribe to progress changes
   */
  public subscribe(listener: ImageQueueListener): () => void {
    this.listeners.add(listener);
    listener(this.getStats());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Reset stats and clear tracking for a fresh session if needed
   */
  public reset() {
    this.queue = [];
    this.statuses.clear();
    this.retryCounts.clear();
    this.failedUrls.clear();
    this.loadedUrls.clear();
    this.inFlightUrls.clear();
    this.activeCount = 0;
    this.notify();
  }

  public clear() {
    this.reset();
  }

  /**
   * Enqueue an image URL to load with given priority
   */
  public enqueue(url: string, priority: number = 0): Promise<boolean> {
    if (!url) return Promise.resolve(false);

    if (this.loadedUrls.has(url)) {
      return Promise.resolve(true);
    }

    if (this.statuses.get(url) === 'loading' || this.statuses.get(url) === 'pending') {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve, reject) => {
      this.statuses.set(url, 'pending');
      const item: QueueItem = {
        url,
        retries: this.retryCounts.get(url) || 0,
        priority,
        resolve,
        reject,
      };

      // Insert sorted by priority descending
      const insertIdx = this.queue.findIndex(q => q.priority < priority);
      if (insertIdx === -1) {
        this.queue.push(item);
      } else {
        this.queue.splice(insertIdx, 0, item);
      }

      this.notify();
      this.processNext();
    });
  }

  /**
   * Retry all failed URLs
   */
  public retryFailed() {
    const failedList = Array.from(this.failedUrls);
    for (const url of failedList) {
      this.retryUrl(url);
    }
  }

  /**
   * Retry a specific failed URL
   */
  public retryUrl(url: string) {
    this.failedUrls.delete(url);
    this.retryCounts.delete(url);
    this.statuses.delete(url);
    this.enqueue(url, 10);
  }

  private processNext() {
    while (this.activeCount < this.maxConcurrency && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.activeCount++;
      this.inFlightUrls.add(item.url);
      this.statuses.set(item.url, 'loading');
      this.notify();

      this.loadSingleImage(item.url)
        .then(() => {
          this.loadedUrls.add(item.url);
          this.failedUrls.delete(item.url);
          this.statuses.set(item.url, 'loaded');
          item.resolve(true);
        })
        .catch(() => {
          const currentRetries = (this.retryCounts.get(item.url) || 0) + 1;
          this.retryCounts.set(item.url, currentRetries);

          if (currentRetries <= this.maxRetries) {
            // Exponential backoff: 300ms, 600ms, 1200ms without blocking activeCount slot
            const backoffDelay = Math.min(2500, 300 * Math.pow(2, currentRetries - 1));
            this.statuses.set(item.url, 'pending');
            setTimeout(() => {
              this.queue.push(item);
              this.notify();
              this.processNext();
            }, backoffDelay);
          } else {
            // Exhausted retries
            this.failedUrls.add(item.url);
            this.statuses.set(item.url, 'failed');
            item.resolve(false);
          }
        })
        .finally(() => {
          this.activeCount--;
          this.inFlightUrls.delete(item.url);
          this.notify();
          this.processNext();
        });
    }
  }

  private async loadSingleImage(url: string): Promise<void> {
    // 1. Check persistent browser Cache API first (Cache API / disk cache)
    if (await persistentImageCache.has(url)) {
      await persistentImageCache.getBlobUrl(url);
      return;
    }

    // 2. Fetch and store in persistent Cache API with timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      await persistentImageCache.fetchAndCache(url, controller.signal);
    } catch {
      // 3. Fallback to standard Image loading if fetch failed
      await this.loadViaHtmlImage(url);
    } finally {
      clearTimeout(timer);
    }
  }

  private loadViaHtmlImage(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (typeof window === 'undefined' || typeof Image === 'undefined') {
        // Node / SSR / Test environment simulation
        fetch(url, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } })
          .then(res => {
            if (res.ok) resolve();
            else reject(new Error(`HTTP ${res.status}`));
          })
          .catch(reject);
        return;
      }

      let finished = false;
      const img = new Image();

      const timer = setTimeout(() => {
        if (!finished) {
          finished = true;
          img.src = '';
          reject(new Error('Image load timeout'));
        }
      }, this.timeoutMs);

      img.onload = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve();
        }
      };

      img.onerror = () => {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          reject(new Error('Image load error'));
        }
      };

      img.src = url;
      if (img.complete && img.naturalWidth > 0) {
        if (!finished) {
          finished = true;
          clearTimeout(timer);
          resolve();
        }
      }
    });
  }

  private notify() {
    const stats = this.getStats();
    for (const listener of this.listeners) {
      try {
        listener(stats);
      } catch (err) {
        console.error('Error in ImageLoaderQueue listener:', err);
      }
    }
  }
}

export const imageLoaderQueue = new ImageLoaderQueue();

if (typeof window !== 'undefined') {
  (window as any).__imageLoaderQueue = imageLoaderQueue;
}
