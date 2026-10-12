import type {
  AppState,
  InferenceSettings,
  InputAudio,
  Run,
  SegmentSettings,
  Session,
} from './types';
import { activeScene, contextFor, id, initialState, reduce } from './state';
import { parseOutput } from './output';
import { record, recordError } from './diagnostics';
import { WorkerAdapter } from '../model/adapter';
import { dtypeLabel, modelById } from '../model/catalog';
import { AudioQueue } from '../audio/queue';
import { decodeFile, startMicrophone } from '../audio/capture';
import type { Store } from './store';
export interface EngineView {
  status:
    | 'idle'
    | 'loading'
    | 'ready'
    | 'listening'
    | 'paused'
    | 'testing'
    | 'stopping';
  processing: boolean;
  loaded: boolean;
  verified: boolean;
  progress: string;
  percent?: number;
  backlogMs: number;
  error: string;
  warning: string;
  result: string;
  facts: number;
  canVerify: boolean;
  lastRun?: Run;
  level: number;
}
export class Engine {
  view: EngineView = {
    status: 'idle',
    processing: false,
    loaded: false,
    verified: false,
    progress: '',
    backlogMs: 0,
    error: '',
    warning: '',
    result: '',
    facts: 0,
    canVerify: false,
    level: 0,
  };
  onChange: (view: EngineView) => void = () => {};
  adapter = new WorkerAdapter();
  modelId = 'gemma4';
  provider = 'webgpu' as const;
  private queue?: AudioQueue;
  private segmenter?: Worker;
  private stopCapture?: () => Promise<void>;
  private cancelled = false;
  private epoch = 0;
  private captureEpoch = 0;
  private flushPromise?: Promise<void>;
  private clockStart = 0;
  private recent = '';
  private testState?: AppState;
  private run?: Run;
  private wakeLock?: WakeLockSentinel;
  private flushed?: () => void;
  private acks = new Map<number, () => void>();
  private ackId = 0;
  private used = false;
  constructor(private store: Store) {
    this.adapter.onFatal = (message) => {
      this.cancel();
      this.update({ error: message });
    };
  }
  private update(patch: Partial<EngineView>) {
    this.view = { ...this.view, ...patch };
    this.onChange(this.view);
  }
  clearError() {
    this.update({ error: '', warning: '' });
  }
  async load(
    modelId: string,
    provider: 'webgpu',
    download: boolean,
    installOnly = false,
  ) {
    if (
      this.view.loaded &&
      this.modelId === modelId &&
      this.provider === provider
    )
      return;
    this.cancel();
    const epoch = this.epoch;
    this.modelId = modelId;
    this.provider = provider;
    this.used = false;
    this.update({
      status: 'loading',
      error: '',
      warning: '',
      progress: 'Model voorbereiden…',
      percent: undefined,
      result: '',
      canVerify: false,
    });
    record('model_load', { model: modelId, provider });
    try {
      await this.adapter.load(
        modelId,
        provider,
        download,
        (label, percent) => {
          if (epoch === this.epoch) this.update({ progress: label, percent });
        },
        installOnly,
      );
      if (epoch !== this.epoch) return;
      record('model_ready', { model: modelId });
      this.update({
        status: installOnly ? 'idle' : 'ready',
        loaded: !installOnly,
        verified: false,
        progress: installOnly ? 'Model gedownload.' : 'Model geladen.',
      });
    } catch (e) {
      record('model_failure', { name: e instanceof Error ? e.name : 'Error' });
      recordError('model_load', e);
      if (epoch === this.epoch) {
        this.adapter.unload();
        this.update({ status: 'idle', loaded: false, error: this.message(e) });
      }
    }
  }
  verify() {
    if (this.view.canVerify && this.view.loaded)
      this.update({ verified: true });
  }
  invalidateQuality() {
    this.update({ verified: false, canVerify: false });
  }
  private message(e: unknown) {
    return e instanceof Error ? e.message : 'Verwerking mislukt.';
  }
  private createPipeline(
    sessionId: string,
    settings: InferenceSettings,
    segments: SegmentSettings,
    test: boolean,
  ) {
    const max = modelById(this.modelId).maxAudioSeconds;
    if (
      ![
        ...Object.values(segments),
        settings.maxTokens,
        settings.contextChars,
      ].every(Number.isFinite) ||
      settings.maxTokens < 64 ||
      settings.maxTokens > 1024 ||
      settings.contextChars < 0 ||
      settings.contextChars > 16000 ||
      segments.silenceMs < 100 ||
      segments.silenceMs > 2000 ||
      segments.threshold < 0.001 ||
      segments.threshold > 0.2 ||
      segments.overlapMs < 0 ||
      segments.preRollMs < 0
    )
      throw Error('Kies geldige waarden binnen de aangegeven bereiken.');
    if (
      segments.chunkSeconds > max ||
      segments.chunkSeconds < 2 ||
      segments.overlapMs >= segments.chunkSeconds * 1000 ||
      segments.preRollMs + 20 > segments.chunkSeconds * 1000
    )
      throw Error('Ongeldige fragmentinstellingen.');
    if (!this.view.loaded) throw Error('Laad eerst een model.');
    this.cancelled = false;
    const epoch = ++this.epoch;
    this.recent = '';
    this.clockStart = performance.now();
    this.update({
      error: '',
      warning: '',
      result: '',
      facts: 0,
      canVerify: false,
      backlogMs: 0,
    });
    if (test) {
      const state = initialState();
      state.campaigns = [{ id: 'test', name: 'Test', glossary: [] }];
      this.testState = reduce(state, {
        type: 'session',
        id: sessionId,
        sceneId: id(),
        campaignId: 'test',
        title: 'Test',
      });
    } else this.testState = undefined;
    this.queue = new AudioQueue(
      async (audio) => {
        if (this.cancelled || epoch !== this.epoch) return;
        const state = this.testState ?? this.store.state;
        const session = state.sessions.find((s) => s.id === sessionId);
        if (!session) throw Error('Sessie bestaat niet meer.');
        const scene = activeScene(session),
          requestId = id();
        const baseRevision = scene.revision,
          sceneId = scene.id;
        const context = contextFor(
          state,
          session,
          this.recent,
          settings.contextChars,
        );
        this.update({ processing: true });
        record('inference_start', {
          startMs: audio.startMs,
          endMs: audio.endMs,
        });
        try {
          const result = await this.adapter.process({
            ...settings,
            audio,
            context,
          });
          if (this.cancelled || epoch !== this.epoch) return;
          this.used = true;
          const output = parseOutput(result.rawText, settings.protocol);
          this.recent = (result.transcript || output.transcript).slice(-2000);
          const action = {
            type: 'proposal' as const,
            proposal: {
              requestId,
              sessionId,
              sceneId,
              baseRevision,
              startMs: audio.startMs,
              endMs: audio.endMs,
              output,
            },
          };
          if (this.testState) this.testState = reduce(this.testState, action);
          else await this.store.dispatch(action);
          const lag = Math.max(
            0,
            performance.now() - this.clockStart - audio.endMs,
          );
          if (this.run) {
            this.run.processingMs += result.totalMs;
            this.run.chunks++;
            this.run.lagMs.push(lag);
          }
          this.update({
            result: result.rawText,
            facts: this.view.facts + output.facts.length,
            warning: output.unparsed
              ? 'Een deel van de modeluitvoer kon niet betrouwbaar worden gelezen. Controleer de testuitvoer; er zijn geen feiten bij verzonnen.'
              : output.endScene
                ? 'Het model stelt een scèneovergang voor. Je kunt de scène zelf afronden.'
                : this.view.warning,
          });
          record('inference_done', {
            totalMs: result.totalMs,
            inputTokens: result.inputTokens,
            outputTokens: result.outputTokens,
            lagMs: lag,
          });
          record('parse_result', {
            facts: output.facts.length,
            unparsed: output.unparsed,
          });
        } finally {
          if (epoch === this.epoch) this.update({ processing: false });
        }
      },
      (error, audio) => {
        if (this.cancelled || epoch !== this.epoch) return;
        if (this.run) this.run.failed++;
        this.update({
          error: `Fragment ${Math.round(audio.startMs / 1000)}–${Math.round(audio.endMs / 1000)} s mislukt: ${this.message(error)}. Deze audio is niet bewaard.`,
        });
        recordError('inference', error);
        record('error', {
          stage: 'inference',
          startMs: audio.startMs,
          endMs: audio.endMs,
        });
        if (!test) void this.pause();
      },
      (backlogMs) => this.update({ backlogMs }),
    );
    this.segmenter = new Worker(
      new URL('../audio/segment.worker.ts', import.meta.url),
      { type: 'module' },
    );
    this.segmenter.onmessage = ({ data }) => {
      if (data.type === 'segment') {
        if (!this.queue?.push(data.audio)) {
          this.update({
            error:
              'De audiowachtrij is vol. Opname gepauzeerd; het laatste fragment kon niet verwerkt worden.',
          });
          record('warning', {
            reason: 'queue_full',
            startMs: data.audio.startMs,
            endMs: data.audio.endMs,
          });
          if (this.run) this.run.failed++;
          if (!test) void this.pause();
        } else
          record('chunk_queued', {
            startMs: data.audio.startMs,
            endMs: data.audio.endMs,
          });
      } else if (data.type === 'flushed') {
        this.flushed?.();
        this.flushed = undefined;
      } else if (data.type === 'ack') {
        this.acks.get(data.ack)?.();
        this.acks.delete(data.ack);
      }
    };
    this.segmenter.onerror = () => {
      this.update({
        error: 'Audioverwerking is gestopt. Start het model opnieuw.',
      });
      this.cancel();
    };
    this.segmenter.postMessage({ type: 'init', settings: segments });
  }
  private frame(audio: InputAudio, ack = false) {
    const key = ++this.ackId;
    const promise = ack
      ? new Promise<void>((resolve) => this.acks.set(key, resolve))
      : Promise.resolve();
    this.segmenter?.postMessage(
      {
        type: 'frame',
        pcm: audio.pcm,
        startMs: audio.startMs,
        ack: ack ? key : undefined,
      },
      [audio.pcm.buffer as ArrayBuffer],
    );
    return promise;
  }
  private async flush() {
    if (!this.segmenter) return;
    if (!this.flushPromise)
      this.flushPromise = new Promise<void>((resolve) => {
        this.flushed = () => {
          this.flushPromise = undefined;
          resolve();
        };
        this.segmenter!.postMessage({ type: 'flush' });
      });
    await this.flushPromise;
  }
  async start(
    sessionId: string,
    settings: InferenceSettings,
    segments: SegmentSettings,
  ) {
    if (!this.view.loaded) throw Error('Het model is nog niet geladen.');
    this.createPipeline(sessionId, settings, segments, false);
    await this.resume();
  }
  async resume() {
    const epoch = this.epoch,
      captureEpoch = ++this.captureEpoch;
    this.update({ status: 'listening' });
    try {
      let offset: number | undefined;
      const stop = await startMicrophone(
        (audio) => {
          if (epoch !== this.epoch || captureEpoch !== this.captureEpoch) {
            audio.pcm.fill(0);
            return;
          }
          offset ??= performance.now() - this.clockStart - audio.endMs;
          const rms = Math.sqrt(
            audio.pcm.reduce((s, x) => s + x * x, 0) / audio.pcm.length,
          );
          if (Math.floor(audio.startMs) % 200 === 0)
            this.update({ level: Math.min(1, rms * 10) });
          void this.frame({
            ...audio,
            startMs: audio.startMs + offset,
            endMs: audio.endMs + offset,
          });
        },
        () => {
          this.update({
            warning: 'Microfoontoegang is verloren. Opname gepauzeerd.',
          });
          void this.pause();
        },
      );
      if (epoch !== this.epoch || captureEpoch !== this.captureEpoch) {
        await stop();
        return;
      }
      this.stopCapture = stop;
      this.update({ status: 'listening' });
      record('vad_start');
      try {
        this.wakeLock = await navigator.wakeLock?.request('screen');
      } catch {
        this.update({
          warning:
            'Scherm wakker houden is niet beschikbaar. Houd de app op de voorgrond.',
        });
      }
    } catch (e) {
      if (epoch === this.epoch && captureEpoch === this.captureEpoch)
        this.update({ status: 'paused', error: this.message(e) });
    }
  }
  async pause() {
    this.captureEpoch++;
    const stop = this.stopCapture;
    this.stopCapture = undefined;
    this.update({ status: 'paused', level: 0 });
    await stop?.();
    await this.wakeLock?.release();
    this.wakeLock = undefined;
    await this.flush();
  }
  async stop() {
    const epoch = this.epoch;
    await this.pause();
    if (epoch !== this.epoch) return;
    this.update({ status: 'stopping' });
    await this.queue?.idle();
    if (epoch !== this.epoch) return;
    this.cleanupPipeline();
    this.recent = '';
    this.update({
      status: this.view.loaded ? 'ready' : 'idle',
      processing: false,
    });
    record('session_stop');
  }
  async test(
    file: File,
    settings: InferenceSettings,
    segments: SegmentSettings,
    mode: 'realtime' | 'throughput',
  ) {
    this.cancelled = false;
    let epoch = this.epoch;
    this.update({
      status: 'testing',
      error: '',
      result: '',
      canVerify: false,
      lastRun: undefined,
      verified: false,
    });
    let pcm: Float32Array | undefined;
    let run: Run | undefined;
    try {
      pcm = await decodeFile(file);
      if (this.cancelled || epoch !== this.epoch) return;
      const digest = await crypto.subtle.digest(
        'SHA-256',
        pcm.buffer as ArrayBuffer,
      );
      const hash = Array.from(new Uint8Array(digest), (x) =>
        x.toString(16).padStart(2, '0'),
      ).join('');
      if (this.cancelled || epoch !== this.epoch) return;
      this.createPipeline(id(), settings, segments, true);
      epoch = this.epoch;
      const spec = modelById(this.modelId);
      this.run = run = {
        id: id(),
        at: new Date().toISOString(),
        model: spec.repo,
        revision: spec.revision,
        provider: this.provider,
        dtype: dtypeLabel(),
        thinking: settings.thinking,
        strategy: settings.strategy,
        protocol: settings.protocol,
        mode,
        inputHash: hash,
        audioMs: pcm.length / 16,
        processingMs: 0,
        elapsedMs: 0,
        chunks: 0,
        failed: 0,
        lagMs: [],
        userAgent: navigator.userAgent,
        cold: !this.used,
        settings: { ...segments },
        maxTokens: settings.maxTokens,
        contextChars: settings.contextChars,
        status: 'completed',
      };
      for (
        let offset = 0;
        offset < pcm.length && !this.cancelled && epoch === this.epoch;
        offset += 320
      ) {
        const startMs = offset / 16;
        if (mode === 'realtime') {
          const wait = startMs - (performance.now() - this.clockStart);
          if (wait > 0)
            await new Promise((resolve) => setTimeout(resolve, wait));
        }
        if (this.cancelled || epoch !== this.epoch) break;
        const frame = pcm.slice(offset, Math.min(pcm.length, offset + 320));
        await this.frame(
          {
            pcm: frame,
            sampleRate: 16000,
            startMs,
            endMs: startMs + frame.length / 16,
          },
          true,
        );
        if (mode === 'throughput') await this.queue?.idle();
      }
      if (!this.cancelled && epoch === this.epoch) {
        await this.flush();
        await this.queue?.idle();
      }
      if (run) {
        run.elapsedMs = performance.now() - this.clockStart;
        run.status =
          this.cancelled || epoch !== this.epoch
            ? 'cancelled'
            : run.failed
              ? 'failed'
              : 'completed';
        await this.store.dispatch({ type: 'run', run });
        if (epoch === this.epoch)
          this.update({
            lastRun: run,
            canVerify:
              run.status === 'completed' &&
              run.chunks > 0 &&
              this.view.facts > 0,
          });
      }
    } catch (e) {
      if (epoch === this.epoch) this.update({ error: this.message(e) });
    } finally {
      pcm?.fill(0);
      if (epoch === this.epoch) {
        this.run = undefined;
        this.testState = undefined;
        this.recent = '';
        this.cleanupPipeline();
        this.update({
          status: this.view.loaded ? 'ready' : 'idle',
          processing: false,
        });
      }
    }
  }
  private cleanupPipeline() {
    this.segmenter?.terminate();
    this.segmenter = undefined;
    this.flushed?.();
    this.flushed = undefined;
    this.acks.forEach((resolve) => resolve());
    this.acks.clear();
    this.queue?.stop();
    this.queue = undefined;
  }
  cancel() {
    this.cancelled = true;
    this.epoch++;
    this.captureEpoch++;
    void this.stopCapture?.();
    this.stopCapture = undefined;
    void this.wakeLock?.release();
    this.wakeLock = undefined;
    this.cleanupPipeline();
    this.adapter.unload();
    this.recent = '';
    this.run = undefined;
    this.testState = undefined;
    this.update({
      status: 'idle',
      loaded: false,
      verified: false,
      processing: false,
      canVerify: false,
      backlogMs: 0,
      level: 0,
    });
    record('model_unload');
  }
  background() {
    if (this.view.status === 'listening') {
      this.update({
        warning:
          'De app ging naar de achtergrond. Opname gepauzeerd om onopgemerkte gaten te voorkomen.',
      });
      void this.pause();
    }
  }
  get testSession(): Session | undefined {
    return this.testState?.sessions[0];
  }
}
