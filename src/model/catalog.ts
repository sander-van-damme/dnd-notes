export const MODEL_CACHE = 'dnd-models-v1';
export const RUNTIME_VERSION = '4.3.1';
export const models = [
  {
    id: 'gemma4',
    name: 'Gemma 4 E2B',
    repo: 'onnx-community/gemma-4-E2B-it-ONNX',
    revision: '7c6d3d1d4092253ea241428e88312ab34bfa9c26',
    license: 'Apache-2.0',
    estimatedGB: 4.5,
    maxAudioSeconds: 30,
    sampleRate: 16000,
    thinking: true,
    description:
      'Eerste kandidaat uit de blauwdruk. Multimodaal; kwaliteit en snelheid op jouw toestel te testen.',
  },
  {
    id: 'ultravox',
    name: 'Ultravox 1B',
    repo: 'onnx-community/ultravox-v0_5-llama-3_2-1b-ONNX',
    revision: '1ccaedd19b01bc50b5257800ea8b90f53a5cbffa',
    license: 'MIT (conversie); Llama 3.2-voorwaarden voor basismodel',
    estimatedGB: 1.6,
    maxAudioSeconds: 30,
    sampleRate: 16000,
    thinking: false,
    description:
      'Kleinere audiokandidaat. Geen thinkingmodus; Nederlandse notitiekwaliteit te testen.',
  },
] as const;
export const modelById = (id: string) => {
  const m = models.find((m) => m.id === id);
  if (!m) throw Error('Onbekend model.');
  return m;
};
export const dtypeLabel = (id: string, provider: string) =>
  id === 'ultravox'
    ? 'audio q4 / embedding q8 / decoder q4'
    : provider === 'webgpu'
      ? 'encoders fp16 / decoder + embedding q4f16'
      : 'encoders q4 / decoder + embedding q4';
export async function capabilities() {
  const gpu = (
    navigator as Navigator & {
      gpu?: {
        requestAdapter: () => Promise<{
          features: Set<string>;
          info?: { vendor?: string; architecture?: string };
        } | null>;
      };
    }
  ).gpu;
  const adapter = await gpu?.requestAdapter();
  return {
    secure: isSecureContext,
    microphone: !!navigator.mediaDevices?.getUserMedia,
    webgpu: !!adapter,
    fp16: !!adapter?.features.has('shader-f16'),
    adapter: adapter?.info?.architecture ?? 'onbekend',
    storage: await navigator.storage?.estimate(),
  };
}
export async function cacheStatus() {
  const cache = await caches.open(MODEL_CACHE),
    keys = await cache.keys();
  return models.map((model) => ({
    id: model.id,
    files: keys.filter((k) =>
      k.url.includes(`${model.repo}/resolve/${model.revision}/`),
    ).length,
  }));
}
export async function clearModelCache() {
  await caches.delete(MODEL_CACHE);
}
