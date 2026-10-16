export type ScryfallQueueListener = (queueSize: number) => void;

class ScryfallQueueService {
  private queueSize: number = 0;
  private listeners: Set<ScryfallQueueListener> = new Set();

  public getQueueSize(): number {
    return this.queueSize;
  }

  public setQueueSize(size: number) {
    this.queueSize = Math.max(0, Math.floor(size));
    this.notify();
  }

  public increment(by: number = 1) {
    this.queueSize += by;
    this.notify();
  }

  public decrement(by: number = 1) {
    this.queueSize = Math.max(0, this.queueSize - by);
    this.notify();
  }

  public subscribe(listener: ScryfallQueueListener): () => void {
    this.listeners.add(listener);
    listener(this.queueSize);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.queueSize);
      } catch (err) {
        console.error('Error in scryfallQueue listener:', err);
      }
    }
  }
}

export const scryfallQueue = new ScryfallQueueService();

if (typeof window !== 'undefined') {
  (window as any).__simulateScryfallQueue = (count: number) => {
    scryfallQueue.setQueueSize(count);
  };
  (window as any).__getScryfallQueueSize = () => scryfallQueue.getQueueSize();
}
