import { afterEach, expect, it, vi } from 'vitest';
import { WorkerAdapter } from './adapter';
class FakeWorker {
  static current: FakeWorker;
  onmessage?: (e: { data: object }) => void;
  terminate = vi.fn();
  postMessage = vi.fn();
  constructor() {
    FakeWorker.current = this;
  }
}
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('breekt een vastgelopen worker af met een exporteerbare timeoutfout', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('Worker', FakeWorker);
  const adapter = new WorkerAdapter();
  adapter.onFatal = vi.fn();
  const pending = adapter.load('gemma4', 'webgpu', false, vi.fn());
  const failure = expect(pending).rejects.toThrow('Model gestopt');
  await vi.advanceTimersByTimeAsync(240001);
  await failure;
  expect(adapter.onFatal).toHaveBeenCalledWith(
    expect.stringContaining('vier minuten'),
  );
  expect(FakeWorker.current.terminate).toHaveBeenCalled();
});
it('houdt een succesvol geladen model onbeperkt beschikbaar als er geen opdracht loopt', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('Worker', FakeWorker);
  const adapter = new WorkerAdapter();
  adapter.onFatal = vi.fn();
  const pending = adapter.load('gemma4', 'webgpu', false, vi.fn());
  FakeWorker.current.onmessage!({ data: { id: 1, result: true } });
  await pending;
  await vi.advanceTimersByTimeAsync(3600000);
  expect(FakeWorker.current.terminate).not.toHaveBeenCalled();
  expect(adapter.onFatal).not.toHaveBeenCalled();
  adapter.unload();
});
