import assets from './assets.json';
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
] as const;
export const modelById = (id: string) => {
  const m = models.find((m) => m.id === id);
  if (!m) throw Error('Onbekend model.');
  return m;
};
export const dtypeLabel = () => 'encoders fp16 / decoder + embedding q4f16';
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
export const modelAssets = assets.gemma4.filter((asset) =>
  /onnx\/(audio_encoder_fp16|vision_encoder_fp16|embed_tokens_q4f16|decoder_model_merged_q4f16)\.onnx(?:_data)?$/.test(
    asset.path,
  ),
);
export const metadataFiles = [
  'config.json',
  'generation_config.json',
  'preprocessor_config.json',
  'processor_config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'chat_template.jinja',
];
export const modelFiles = [...modelAssets.map((a) => a.path), ...metadataFiles];
export const modelBytes = modelAssets.reduce((sum, a) => sum + a.size, 0);
export const modelUrl = (path: string) =>
  `https://huggingface.co/${models[0].repo}/resolve/${models[0].revision}/${path}`;
export async function cacheStatus() {
  const cache = await caches.open(MODEL_CACHE),
    keys = await cache.keys();
  let bytes = 0,
    files = 0;
  for (const path of modelFiles) {
    const response = await cache.match(modelUrl(path));
    const asset = modelAssets.find((a) => a.path === path);
    if (
      response &&
      (!asset || Number(response.headers.get('content-length')) === asset.size)
    ) {
      files++;
      bytes += Number(response.headers.get('content-length')) || 0;
    }
  }
  const old = keys.some(
    (k) =>
      k.url.includes(`${models[0].repo}/resolve/`) &&
      !k.url.includes(`/resolve/${models[0].revision}/`),
  );
  return [
    {
      id: 'gemma4',
      files,
      bytes,
      installed: files === modelFiles.length,
      update: old && files !== modelFiles.length,
    },
  ];
}
export async function clearModelCache() {
  await caches.delete(MODEL_CACHE);
}
