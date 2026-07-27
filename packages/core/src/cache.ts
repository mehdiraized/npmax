export class TtlCache<T> {
  private store = new Map<string, { data: T; ts: number }>();
  constructor(private ttlMs = 30 * 60 * 1000) {}
  get(key: string): T | undefined {
    const hit = this.store.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.ts > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return hit.data;
  }
  set(key: string, data: T): void {
    this.store.set(key, { data, ts: Date.now() });
  }
}
