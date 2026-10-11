import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const profile = vi.hoisted(() => ({
  assets: [
    {
      path: 'onnx/embed_tokens_q4f16.onnx_data',
      size: 3,
      sha256:
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    },
  ],
}));
vi.mock('./catalog', () => ({
  MODEL_CACHE: 'test',
  modelAssets: profile.assets,
  modelFiles: ['config.json', profile.assets[0].path],
  modelBytes: 3,
  modelUrl: (path: string) => `https://example.test/${path}`,
}));
import { prepareModel } from './install';
let entries: Map<string, Response>;
beforeEach(() => {
  entries = new Map([['https://example.test/config.json', Response.json({})]]);
  vi.stubGlobal('caches', {
    open: async () => ({
      match: async (url: string) => entries.get(url)?.clone(),
      delete: async (url: string) => entries.delete(url),
      put: async (url: string, response: Response) => {
        const bytes = await response.arrayBuffer();
        entries.set(url, new Response(bytes, { headers: response.headers }));
      },
    }),
  });
});
afterEach(() => vi.unstubAllGlobals());
it('wijst een cache zonder extern Gemma-gewicht direct af in plaats van te blijven laden', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  await expect(prepareModel(false, vi.fn())).rejects.toThrow(
    'embed_tokens_q4f16.onnx_data',
  );
  expect(fetch).not.toHaveBeenCalled();
});
it('herstelt alleen ontbrekende bestanden en kan daarna volledig offline controleren', async () => {
  const fetch = vi.fn(
    async () => new Response('abc', { headers: { 'content-length': '3' } }),
  );
  vi.stubGlobal('fetch', fetch);
  const progress = vi.fn();
  await prepareModel(true, progress);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(progress).toHaveBeenLastCalledWith('Download compleet', 100);
  await prepareModel(false, progress);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('verwijdert corrupt extern gewicht en accepteert het niet als geïnstalleerd', async () => {
  entries.set(
    'https://example.test/onnx/embed_tokens_q4f16.onnx_data',
    new Response('bad'),
  );
  await expect(prepareModel(false, vi.fn())).rejects.toThrow('onvolledig');
  expect(
    entries.has('https://example.test/onnx/embed_tokens_q4f16.onnx_data'),
  ).toBe(false);
});
