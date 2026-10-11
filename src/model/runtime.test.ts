import { afterEach, expect, it, vi } from 'vitest';
import { cloudflareWasm } from './runtime';

afterEach(() => vi.unstubAllGlobals());

it('voegt runtimebestanden in de juiste volgorde samen', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(
      Response.json([
        { path: '/ort/a', size: 2 },
        { path: '/ort/b', size: 1 },
      ]),
    )
    .mockResolvedValueOnce(new Response(new Uint8Array([0, 97])))
    .mockResolvedValueOnce(new Response(new Uint8Array([115])));
  vi.stubGlobal('fetch', fetch);
  expect(await cloudflareWasm()).toEqual(new Uint8Array([0, 97, 115]));
  expect(fetch.mock.calls.map(([path]) => path)).toEqual([
    '/ort/runtime.json',
    '/ort/a',
    '/ort/b',
  ]);
});

it('weigert ontbrekende of afgebroken runtimebestanden', async () => {
  for (const response of [
    new Response(null, { status: 404 }),
    new Response(new Uint8Array([0])),
  ]) {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(Response.json([{ path: '/ort/a', size: 2 }]))
        .mockResolvedValueOnce(response),
    );
    await expect(cloudflareWasm()).rejects.toThrow();
  }
});
