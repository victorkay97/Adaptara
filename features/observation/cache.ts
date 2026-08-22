/** Short-lived server cache with in-flight de-duplication; failures are never cached. */
export class ObservationCache<T> {
  private value: { expiresAt: number; data: T } | null = null;
  private pending: Promise<T> | null = null;
  constructor(private readonly ttlMs: number) {}
  async get(now: Date, load: () => Promise<T>): Promise<T> {
    if (this.value && this.value.expiresAt > now.getTime()) return this.value.data;
    if (this.pending) return this.pending;
    this.pending = load().then((data) => { this.value = { data, expiresAt: now.getTime() + this.ttlMs }; return data; });
    try { return await this.pending; } finally { this.pending = null; }
  }
  clear() { this.value = null; }
}
