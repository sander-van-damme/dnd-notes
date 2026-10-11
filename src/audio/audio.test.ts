import { describe, expect, it, vi } from 'vitest';
import { defaultSegments, Segmenter } from './segmenter';
import { AudioQueue } from './queue';
import type { InputAudio } from '../core/types';
const audio = (duration = 1000): InputAudio => ({
  pcm: new Float32Array(duration * 16).fill(0.1),
  sampleRate: 16000,
  startMs: 0,
  endMs: duration,
});
describe('tijdlijn en begrensde audio', () => {
  it('bewaart stiltes op de tijdlijn en pre-roll bij spraak', () => {
    const chunks: InputAudio[] = [];
    const s = new Segmenter({ ...defaultSegments, chunkSeconds: 2 }, (a) =>
      chunks.push(a),
    );
    for (let t = 0; t < 4000; t += 20)
      s.push(new Float32Array(320).fill(t >= 1000 && t < 1400 ? 0.2 : 0), t);
    s.flush();
    expect(chunks).toHaveLength(1);
    expect(chunks[0].startMs).toBe(700);
    expect(chunks[0].endMs).toBe(2000);
  });
  it('overschrijdt de modellimiet niet en behoudt overlap', () => {
    const chunks: InputAudio[] = [];
    const s = new Segmenter(
      { ...defaultSegments, chunkSeconds: 2, overlapMs: 500 },
      (a) => chunks.push(a),
    );
    for (let t = 0; t < 5000; t += 20)
      s.push(new Float32Array(320).fill(0.1), t);
    s.flush();
    expect(chunks.every((c) => c.endMs - c.startMs <= 2000)).toBe(true);
    expect(chunks[1].startMs).toBe(chunks[0].endMs - 500);
    expect(chunks.at(-1)?.endMs).toBe(5000);
  });
  it('produceert geen fictieve spraak bij stilte of een lege flush', () => {
    const emit = vi.fn(),
      s = new Segmenter(defaultSegments, emit);
    for (let t = 0; t < 10000; t += 20) s.push(new Float32Array(320), t);
    s.flush();
    s.flush();
    expect(emit).not.toHaveBeenCalled();
  });
  it('verwerkt sequentieel, weigert overloop en wist PCM', async () => {
    let release = () => {};
    const done = new Promise<void>((r) => (release = r));
    let active = 0,
      max = 0;
    const q = new AudioQueue(
      async () => {
        active++;
        max = Math.max(max, active);
        await done;
        active--;
      },
      () => {},
      () => {},
      1000,
    );
    const first = audio(),
      second = audio(),
      third = audio();
    expect(q.push(first)).toBe(true);
    expect(q.push(second)).toBe(true);
    expect(q.push(third)).toBe(false);
    expect(third.pcm.every((x) => x === 0)).toBe(true);
    release();
    await q.idle();
    expect(max).toBe(1);
    expect(first.pcm.every((x) => x === 0)).toBe(true);
    expect(second.pcm.every((x) => x === 0)).toBe(true);
  });
  it('meldt mislukte intervallen en verwerkt daarna de volgende opdracht', async () => {
    const errors = vi.fn();
    let i = 0;
    const q = new AudioQueue(
      async () => {
        if (i++ === 0) throw Error('device loss');
      },
      errors,
      () => {},
    );
    q.push(audio());
    q.push(audio());
    await q.idle();
    expect(errors).toHaveBeenCalledTimes(1);
    expect(i).toBe(2);
  });
});
