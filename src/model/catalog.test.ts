import { afterEach, expect, it, vi } from 'vitest';
import {
  cacheStatus,
  clearLegacyModelCache,
  isLegacyModelUrl,
  modelAssets,
  modelBytes,
  modelDtypes,
  modelFiles,
  modelUrl,
  models,
} from './catalog';

afterEach(() => vi.unstubAllGlobals());

it('pins exactly the QAT Mobile WebGPU audio profile and verified weights', () => {
  expect(models[0]).toMatchObject({
    id: 'gemma4',
    repo: 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
    revision: '70dab57c7bc59f33b4fc32809299cb8b4465e96c',
  });
  expect(modelDtypes).toEqual({
    audio_encoder: 'q2f16',
    vision_encoder: 'fp16',
    embed_tokens: 'q2f16',
    decoder_model_merged: 'q2f16',
  });
  expect(modelAssets).toHaveLength(8);
  expect(new Set(modelAssets.map((a) => a.path)).size).toBe(8);
  for (const [component, dtype] of Object.entries(modelDtypes)) {
    expect(modelAssets.map((a) => a.path)).toContain(
      `onnx/${component}_${dtype}.onnx`,
    );
    expect(modelAssets.map((a) => a.path)).toContain(
      `onnx/${component}_${dtype}.onnx_data`,
    );
  }
  expect(modelAssets.every((a) => /^[a-f0-9]{64}$/.test(a.sha256))).toBe(true);
  expect(modelBytes).toBe(2571751525);
  expect(modelFiles).toContain('tokenizer.json');
  expect(modelFiles).toContain('processor_config.json');
  expect(modelFiles).not.toContain('onnx/decoder_model_merged_q4f16.onnx');
  expect(modelUrl('config.json')).toContain(
    '/resolve/70dab57c7bc59f33b4fc32809299cb8b4465e96c/',
  );
});

it('telt een ontbrekend q2f16-extern bestand niet als geinstalleerd model', async () => {
  const paths = new Set(modelFiles);
  const missing = 'onnx/decoder_model_merged_q2f16.onnx_data';
  paths.delete(missing);
  const legacyUrl =
    'https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX/resolve/old/onnx/decoder_model_merged_q4f16.onnx_data';
  vi.stubGlobal('caches', {
    open: async () => ({
      keys: async () =>
        [...paths]
          .map((path) => ({ url: modelUrl(path) }))
          .concat({ url: legacyUrl }),
      match: async (url: string) => {
        const path = modelFiles.find((path) => modelUrl(path) === url);
        return path && paths.has(path)
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
    legacyFiles: 1,
  });
  paths.add(missing);
  expect((await cacheStatus())[0]).toMatchObject({
    installed: true,
    update: false,
    legacyFiles: 1,
  });
});

it('wist uitsluitend oude modelbestanden en bewaart QAT, privacydata en andere caches', async () => {
  const staleRevision = modelUrl('config.json').replace(
    models[0].revision,
    'outdated',
  );
  const legacy =
    'https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX/resolve/previous/config.json';
  const active = modelUrl('config.json');
  const unrelated = 'https://example.com/other-cache';
  const keys = new Set([staleRevision, legacy, active, unrelated]);
  vi.stubGlobal('caches', {
    open: async () => ({
      keys: async () => [...keys].map((url) => ({ url })),
      delete: async (request: { url: string }) => keys.delete(request.url),
    }),
  });
  expect(isLegacyModelUrl(legacy)).toBe(true);
  expect(isLegacyModelUrl(active)).toBe(false);
  expect(isLegacyModelUrl(unrelated)).toBe(false);
  await clearLegacyModelCache();
  expect([...keys]).toEqual([active, unrelated]);
});
