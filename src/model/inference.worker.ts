import {
  env,
  Gemma4Processor,
  Gemma4ForConditionalGeneration,
  Tensor,
  type PreTrainedModel,
} from '@huggingface/transformers';
import { MODEL_CACHE, modelById, modelDtypes } from './catalog';
import { prepareModel } from './install';
import { notesPrompt, transcribePrompt } from './prompts';
import { finalText } from '../core/output';
import assets from './assets.json';
import { verifiedResponse } from './integrity';
import { cloudflareWasm } from './runtime';
import type { ProcessingRequest, ProcessingResult } from '../core/types';
// All inference happens in this disposable worker. Terminating it aborts generation
// and releases the audio, model sessions and GPU resources together.
// Keep the library's cache-only configuration valid. Local filesystem probes
// receive an in-memory 404 below; they never trigger a network request.
env.allowLocalModels = true;
env.localModelPath = '/models/';
env.useBrowserCache = true;
env.cacheKey = MODEL_CACHE;
env.useWasmCache = false; // Same-origin runtime files are precached by our service worker.
if (env.backends.onnx?.wasm) {
  env.backends.onnx.wasm.wasmPaths = {
    mjs: `${self.location.origin}/ort/ort-wasm-simd-threaded.asyncify.mjs`,
    wasm: `${self.location.origin}/ort/ort-wasm-simd-threaded.asyncify.wasm`,
  };
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}
let networkAllowed = false;
let loadRequestId = 0;
const nativeFetch = self.fetch.bind(self);
env.fetch = async (input, init) => {
  const url = new URL(String(input), self.location.origin);
  if (init?.body || (init?.method && init.method !== 'GET'))
    throw Error('Alleen downloads zijn toegestaan.');
  if (
    url.origin === self.location.origin &&
    url.pathname.startsWith('/models/')
  )
    return new Response(null, { status: 404 });
  if (url.origin === self.location.origin && url.pathname.startsWith('/ort/'))
    return nativeFetch(input, init);
  if (!networkAllowed || url.hostname !== 'huggingface.co')
    throw Error(
      'Netwerk uitgeschakeld tijdens lokale verwerking. Download het model eerst.',
    );
  const spec = modelById(modelId);
  const prefix = `/${spec.repo}/resolve/${spec.revision}/`;
  if (!url.pathname.startsWith(prefix))
    throw Error('Onverwachte modelrevisie.');
  const response = await nativeFetch(input, {
    ...init,
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
  });
  const asset = assets[spec.id].find(
    (a) => a.path === url.pathname.slice(prefix.length),
  );
  if (url.pathname.includes('/onnx/') && !asset)
    throw Error('Dit modelbestand staat niet in het integriteitsmanifest.');
  if (!response.ok || !asset) return response;
  // Store the verified network stream before ONNX allocates its model buffer.
  // Chromium can reject large cache.put(new Response(wholeModelBuffer)) calls.
  const cache = await caches.open(MODEL_CACHE);
  let lastProgress = 0;
  try {
    await cache.put(
      url.href,
      verifiedResponse(response, asset, (bytes) => {
        if (performance.now() - lastProgress > 150 || bytes === asset.size) {
          lastProgress = performance.now();
          self.postMessage({
            id: loadRequestId,
            progress: {
              label: `Download + SHA-256: ${asset.path}`,
              percent: (bytes / asset.size) * 100,
            },
          });
        }
      }),
    );
  } catch (error) {
    throw Error(
      `Modelbestand kon niet veilig worden opgeslagen: ${asset.path}. Gebruik een normaal browserprofiel (privémodus kan grote bestanden weigeren) en controleer de vrije opslag. ${error instanceof Error ? error.message : ''}`,
      { cause: error },
    );
  }
  const stored = await cache.match(url.href);
  if (!stored)
    throw Error(
      'Modelcache kon niet worden geschreven. Maak browseropslag vrij.',
    );
  return stored;
};
let processor: Gemma4Processor | null = null;
let model: PreTrainedModel | null = null;
let modelId = '';
let busy = false;
const stage = (phase: string, asset = '', ms = 0) =>
  self.postMessage({ id: loadRequestId, diagnostic: { phase, ...(asset && { asset }), ms } });
async function generate(
  system: string,
  text: string,
  audio: Float32Array | null,
  req: ProcessingRequest,
) {
  if (!processor || !model) throw Error('Laad eerst een model.');
  const messages = [
    { role: 'system', content: system },
    {
      role: 'user',
      content: audio ? [{ type: 'audio' }, { type: 'text', text }] : text,
    },
  ];
  const prompt = processor.apply_chat_template(messages, {
    tokenize: false,
    add_generation_prompt: true,
    ...{ enable_thinking: req.thinking === 'on' },
  });
  const inputs = await processor(prompt, null, audio, {
    add_special_tokens: false,
  });
  const inputTokens = inputs.input_ids.dims.at(-1) as number;
  const result = await model.generate({
    ...inputs,
    max_new_tokens: req.maxTokens,
    do_sample: false,
    repetition_penalty: 1.05,
  });
  if (!(result instanceof Tensor)) throw Error('Onverwacht modelresultaat.');
  const generated = result.slice(null, [inputTokens, result.dims[1]]);
  const raw = processor.batch_decode(generated, {
    skip_special_tokens: false,
  })[0];
  return {
    text: finalText(raw),
    inputTokens,
    outputTokens: generated.dims.at(-1) as number,
  };
}
self.onmessage = async ({ data }) => {
  const { id, type } = data;
  if (busy) {
    self.postMessage({ id, error: 'Het model verwerkt nog een opdracht.' });
    return;
  }
  busy = true;
  try {
    if (type === 'load') {
      if (!data.installOnly && import.meta.env.MODE === 'cloudflare') {
        if (!env.backends.onnx.wasm)
          throw Error('WASM-runtime is niet beschikbaar.');
        env.backends.onnx.wasm.wasmBinary = await cloudflareWasm();
      }
      loadRequestId = id;
      const spec = modelById(data.modelId);
      modelId = spec.id;
      // Transformers.js 4.3.1 probes tokenizer_config without forwarding revision.
      // Pin the worker-local URL template too, including its cache keys.
      env.remotePathTemplate = `{model}/resolve/${spec.revision}/`;
      networkAllowed = data.download;
      env.allowRemoteModels = data.download;
      stage('prepare-start');
      let previousAssetStage = '';
      await prepareModel(data.download, (label, percent) => {
        const match = /^(Controleren|Downloaden): (onnx\/[a-z0-9_.-]+)$/.exec(label);
        if (match) {
          const key = match[1] + ':' + match[2];
          if (key !== previousAssetStage) {
            previousAssetStage = key;
            stage(match[1] === 'Controleren' ? 'cache-check' : 'download-start', match[2]);
          }
        }
        self.postMessage({ id, progress: { label, percent } });
      });
      stage('prepare-ready');
      if (data.installOnly) {
        networkAllowed = false;
        env.allowRemoteModels = false;
        self.postMessage({ id, result: true });
        return;
      }
      self.postMessage({
        id,
        progress: { label: 'Model initialiseren op WebGPU…', percent: 100 },
      });
      networkAllowed = false;
      env.allowRemoteModels = false;
      const options = {
        revision: spec.revision,
        local_files_only: true,
        progress_callback: (p: {
          status: string;
          file?: string;
          progress?: number;
        }) =>
          self.postMessage({
            id,
            progress: { label: p.file ?? p.status, percent: p.progress },
          }),
      };
      if (model) await model.dispose();
      model = null;
      processor = null;
      // Sequential initialization avoids a second model and reduces peak memory.
      if (data.provider !== 'webgpu')
        throw Error('Alleen WebGPU wordt ondersteund.');
      const processorStart = performance.now();
      stage('processor-start');
      processor = await Gemma4Processor.from_pretrained(spec.repo, options);
      stage('processor-ready', '', performance.now() - processorStart);
      const onnxStart = performance.now();
      stage('onnx-start');
      model = await Gemma4ForConditionalGeneration.from_pretrained(spec.repo, {
        ...options,
        device: 'webgpu',
        dtype: modelDtypes,
      });
      stage('onnx-ready', '', performance.now() - onnxStart);
      networkAllowed = false;
      env.allowRemoteModels = false;
      self.postMessage({ id, result: true });
    } else if (type === 'process') {
      networkAllowed = false;
      const req = data.request as ProcessingRequest;
      const spec = modelById(modelId);
      if (
        req.audio.sampleRate !== spec.sampleRate ||
        req.audio.pcm.length > spec.sampleRate * spec.maxAudioSeconds
      )
        throw Error('Audioformaat of fragmentlengte niet ondersteund.');
      const start = performance.now();
      let transcript = '',
        inputTokens = 0,
        outputTokens = 0;
      try {
        if (req.strategy === 'two-pass') {
          const first = await generate(transcribePrompt, '', req.audio.pcm, {
            ...req,
            thinking: 'off',
          });
          transcript = first.text;
          inputTokens += first.inputTokens;
          outputTokens += first.outputTokens;
        }
        const second = await generate(
          notesPrompt(req.protocol),
          `CONTEXT (geen nieuw bewijs):\n${req.context}\n\n${transcript ? `NIEUW TRANSCRIPT:\n${transcript}` : 'Beschrijf alleen het nieuwe audiofragment.'}`,
          req.strategy === 'direct' ? req.audio.pcm : null,
          req,
        );
        const result: ProcessingResult = {
          rawText: second.text,
          transcript,
          totalMs: performance.now() - start,
          inputTokens: inputTokens + second.inputTokens,
          outputTokens: outputTokens + second.outputTokens,
        };
        self.postMessage({ id, result });
      } finally {
        req.audio.pcm.fill(0);
      }
    }
  } catch (error) {
    stage('load-failed');
    networkAllowed = false;
    env.allowRemoteModels = false;
    self.postMessage({
      id,
      error:
        error instanceof Error ? error.message : 'Modelverwerking mislukt.',
    });
  } finally {
    busy = false;
  }
};

self.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  self.postMessage({
    id: loadRequestId,
    error:
      event.reason instanceof Error
        ? event.reason.message
        : 'Onbehandelde runtimefout tijdens laden.',
  });
});
