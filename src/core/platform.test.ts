import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllGlobals());

it('records a granted persistent storage permission without affecting model loading', async () => {
  const persist = vi.fn(async () => true);
  vi.stubGlobal('navigator', {
    storage: { persisted: async () => false, persist },
  });
  const { requestPersistentStorage } = await import('./platform');
  await expect(requestPersistentStorage()).resolves.toBeUndefined();
  expect(persist).toHaveBeenCalledOnce();
});

it('treats unavailable storage permission APIs as nonfatal', async () => {
  vi.stubGlobal('navigator', {});
  const { requestPersistentStorage } = await import('./platform');
  await expect(requestPersistentStorage()).resolves.toBeUndefined();
});
