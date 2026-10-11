import { afterEach, expect, it, vi } from 'vitest';
import {
  cacheStatus,
  modelAssets,
  modelFiles,
  modelUrl,
  models,
} from './catalog';
afterEach(() => vi.unstubAllGlobals());
it('telt een ontbrekend onnx_data-bestand niet als geïnstalleerd model', async () => {
  const paths = new Set(modelFiles);
  const missing = 'onnx/decoder_model_merged_q4f16.onnx_data';
  paths.delete(missing);
  const old = modelUrl('config.json').replace(
    models[0].revision,
    'old-revision',
  );
  vi.stubGlobal('caches', {
    open: async () => ({
      keys: async () =>
        [...paths]
          .map((path) => ({ url: modelUrl(path) }))
          .concat({ url: old }),
      match: async (url: string) => {
        const path = modelFiles.find((path) => modelUrl(path) === url)!;
        return paths.has(path)
          ? new Response('', {
              headers: {
                'content-length': String(
                  modelAssets.find((a) => a.path === path)?.size ?? 2,
                ),
              },
            })
          : undefined;
      },
    }),
  });
  expect((await cacheStatus())[0]).toMatchObject({
    installed: false,
    update: true,
  });
  paths.add(missing);
  expect((await cacheStatus())[0]).toMatchObject({
    installed: true,
    update: false,
  });
});
