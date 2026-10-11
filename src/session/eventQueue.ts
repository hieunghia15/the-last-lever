/**
 * Plays events one at a time: the next event starts only after the previous animation's
 * promise settles. The table locks input while `busy` and resumes the match in `onIdle`.
 */
export class EventQueue<E> {
  private pending: E[] = [];
  private running = false;
  private disposed = false;
  private idle: (() => void) | null = null;

  constructor(
    private readonly play: (event: E) => Promise<void>,
    // One broken animation must not freeze the match, so errors are reported and skipped.
    private readonly onError: (error: unknown) => void = (error) => console.error(error),
  ) {}

  get busy(): boolean {
    return this.running || this.pending.length > 0;
  }

  /** Called every time the queue runs dry. */
  onIdle(callback: () => void): void {
    this.idle = callback;
  }

  push(events: readonly E[]): void {
    if (this.disposed || events.length === 0) return;
    this.pending.push(...events);
    if (!this.running) void this.drain();
  }

  /** Drops queued events and goes silent; call when the scene shuts down. */
  dispose(): void {
    this.disposed = true;
    this.pending = [];
    this.idle = null;
  }

  private async drain(): Promise<void> {
    this.running = true;
    for (let event = this.pending.shift(); event !== undefined; event = this.pending.shift()) {
      try {
        await this.play(event);
      } catch (error) {
        this.onError(error);
      }
      if (this.disposed) break;
    }
    this.running = false;
    if (!this.disposed) this.idle?.();
  }
}
