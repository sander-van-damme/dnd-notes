import type { InputAudio } from '../core/types';
export class AudioQueue {
  private items: InputAudio[] = [];
  private running = false;
  private closed = false;
  private waiters: (() => void)[] = [];
  constructor(
    private process: (audio: InputAudio) => Promise<void>,
    private onError: (error: unknown, audio: InputAudio) => void,
    private onDepth: (ms: number) => void,
    private maxMs = 90000,
  ) {}
  push(audio: InputAudio): boolean {
    if (
      this.closed ||
      this.items.reduce((s, a) => s + a.endMs - a.startMs, 0) +
        audio.endMs -
        audio.startMs >
        this.maxMs
    ) {
      audio.pcm.fill(0);
      return false;
    }
    this.items.push(audio);
    this.depth();
    void this.drain();
    return true;
  }
  private depth() {
    this.onDepth(this.items.reduce((s, a) => s + a.endMs - a.startMs, 0));
  }
  private async drain() {
    if (this.running) return;
    this.running = true;
    while (this.items.length && !this.closed) {
      const audio = this.items.shift()!;
      this.depth();
      try {
        await this.process(audio);
      } catch (e) {
        this.onError(e, audio);
      } finally {
        if (audio.pcm.byteLength) audio.pcm.fill(0);
      }
    }
    this.running = false;
    this.waiters.splice(0).forEach((w) => w());
  }
  idle() {
    return this.running || this.items.length
      ? new Promise<void>((resolve) => this.waiters.push(resolve))
      : Promise.resolve();
  }
  stop() {
    this.closed = true;
    for (const a of this.items) a.pcm.fill(0);
    this.items = [];
    this.depth();
  }
}
