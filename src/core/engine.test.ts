import { afterEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  capture: vi.fn(),
  decode: vi.fn(),
  load: vi.fn(),
  unload: vi.fn(),
}));
vi.mock('../audio/capture', () => ({
  startMicrophone: mocks.capture,
  decodeFile: mocks.decode,
}));
vi.mock('../model/adapter', () => ({
  WorkerAdapter: class {
    load = mocks.load;
    unload = mocks.unload;
    process = vi.fn();
  },
}));
import { Engine } from './engine';
import { Store } from './store';
import { defaultSegments } from '../audio/segmenter';
import type { InferenceSettings } from './types';
const settings: InferenceSettings = {
  thinking: 'off',
  strategy: 'direct',
  protocol: 'markers',
  maxTokens: 128,
  contextChars: 2000,
};
class WorkerStub {
  onmessage?: (event: { data: object }) => void;
  postMessage(data: { type: string }) {
    if (data.type === 'flush')
      queueMicrotask(() => this.onmessage?.({ data: { type: 'flushed' } }));
  }
  terminate() {}
}
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});
it('sluit een microfoon die pas na annuleren toestemming kreeg', async () => {
  vi.stubGlobal('Worker', WorkerStub);
  vi.stubGlobal('navigator', {});
  const stop = vi.fn(async () => {});
  let allow!: (fn: () => Promise<void>) => void;
  mocks.capture.mockImplementation(
    () => new Promise((resolve) => (allow = resolve)),
  );
  const engine = new Engine(new Store());
  engine.view = { ...engine.view, loaded: true, verified: true };
  const start = engine.start('session', settings, defaultSegments);
  expect(engine.view.status).toBe('listening');
  engine.cancel();
  allow(stop);
  await start;
  expect(stop).toHaveBeenCalledTimes(1);
  expect(engine.view.status).toBe('idle');
});
it('een oude laadfout overschrijft een later geladen model niet', async () => {
  let reject!: (e: Error) => void;
  mocks.load
    .mockImplementationOnce(() => new Promise((_, r) => (reject = r)))
    .mockResolvedValueOnce(undefined);
  const engine = new Engine(new Store());
  const old = engine.load('gemma4', 'wasm', false);
  await engine.load('ultravox', 'wasm', false);
  reject(Error('oude worker'));
  await old;
  expect(engine.view.loaded).toBe(true);
  expect(engine.view.status).toBe('ready');
  expect(engine.view.error).toBe('');
});
it('wist gedecodeerde audio wanneer tijdens decoderen is geannuleerd', async () => {
  let finish!: (pcm: Float32Array) => void;
  mocks.decode.mockImplementation(
    () => new Promise((resolve) => (finish = resolve)),
  );
  const engine = new Engine(new Store());
  engine.view = { ...engine.view, loaded: true };
  const pcm = new Float32Array(320).fill(0.2);
  const run = engine.test({} as File, settings, defaultSegments, 'throughput');
  engine.cancel();
  finish(pcm);
  await run;
  expect(pcm.every((x) => x === 0)).toBe(true);
  expect(engine.view.status).toBe('idle');
});
it('weigert NaN en onbegrensde fragmentconfiguratie vóór microfoonstart', async () => {
  const engine = new Engine(new Store());
  engine.view = { ...engine.view, loaded: true, verified: true };
  await expect(
    engine.start('s', settings, { ...defaultSegments, threshold: NaN }),
  ).rejects.toThrow('geldige waarden');
  expect(mocks.capture).not.toHaveBeenCalled();
});
it('trekt de kwaliteitsbevestiging in als de modelworker crasht', () => {
  const engine = new Engine(new Store());
  engine.view = { ...engine.view, loaded: true, verified: true };
  engine.adapter.onFatal('Worker gestopt');
  expect(engine.view.loaded).toBe(false);
  expect(engine.view.verified).toBe(false);
  expect(engine.view.error).toBe('Worker gestopt');
});
it('maakt een oud testresultaat ongeldig bij gewijzigde instellingen', () => {
  const engine = new Engine(new Store());
  engine.view = {
    ...engine.view,
    loaded: true,
    canVerify: true,
    verified: true,
  };
  engine.invalidateQuality();
  engine.verify();
  expect(engine.view.canVerify).toBe(false);
  expect(engine.view.verified).toBe(false);
});
