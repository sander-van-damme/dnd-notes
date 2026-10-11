import type { InputAudio, SegmentSettings } from '../core/types';
export const defaultSegments: SegmentSettings = {
  chunkSeconds: 20,
  silenceMs: 600,
  threshold: 0.012,
  overlapMs: 500,
  preRollMs: 300,
};
/** Energy VAD baseline. Frames must be consecutive 20ms PCM at 16kHz. */
export class Segmenter {
  private frames: Float32Array[] = [];
  private pre: Float32Array[] = [];
  private startMs = 0;
  private silenceMs = 0;
  private active = false;
  private hasNewSpeech = false;
  constructor(
    private settings: SegmentSettings,
    private emit: (audio: InputAudio) => void,
  ) {}
  push(pcm: Float32Array, startMs: number) {
    const duration = pcm.length / 16;
    const rms = Math.sqrt(pcm.reduce((s, x) => s + x * x, 0) / pcm.length);
    const speech = rms >= this.settings.threshold;
    if (!this.active) {
      if (!speech) {
        this.pre.push(pcm);
        while (this.pre.length > Math.ceil(this.settings.preRollMs / duration))
          this.pre.shift()?.fill(0);
        return;
      }
      this.active = true;
      this.startMs = startMs - this.pre.reduce((s, f) => s + f.length / 16, 0);
      this.frames = this.pre;
      this.pre = [];
    }
    this.frames.push(pcm);
    this.hasNewSpeech ||= speech;
    this.silenceMs = speech ? 0 : this.silenceMs + duration;
    const lengthMs = this.frames.reduce((s, f) => s + f.length / 16, 0);
    if (
      lengthMs >= this.settings.chunkSeconds * 1000 ||
      this.silenceMs >= this.settings.silenceMs
    ) {
      const overlap = this.silenceMs < this.settings.silenceMs;
      this.emitFrames(overlap);
    }
  }
  private emitFrames(overlap: boolean) {
    if (!this.frames.length) return;
    const total = this.frames.reduce((s, f) => s + f.length, 0);
    if (this.hasNewSpeech) {
      const pcm = new Float32Array(total);
      let offset = 0;
      for (const frame of this.frames) {
        pcm.set(frame, offset);
        offset += frame.length;
      }
      this.emit({
        pcm,
        startMs: this.startMs,
        endMs: this.startMs + total / 16,
        sampleRate: 16000,
      });
    }
    const keep = overlap
      ? Math.min(
          this.frames.length - 1,
          Math.floor(this.settings.overlapMs / 20),
        )
      : 0;
    const retained = keep ? this.frames.slice(-keep) : [];
    for (const f of this.frames.slice(0, this.frames.length - keep)) f.fill(0);
    this.startMs +=
      total / 16 - retained.reduce((s, f) => s + f.length / 16, 0);
    this.frames = retained;
    this.active = !!keep;
    this.silenceMs = 0;
    this.hasNewSpeech = false;
  }
  flush() {
    this.emitFrames(false);
    this.reset();
  }
  reset() {
    for (const f of [...this.frames, ...this.pre]) f.fill(0);
    this.frames = [];
    this.pre = [];
    this.active = false;
    this.hasNewSpeech = false;
    this.silenceMs = 0;
  }
}
