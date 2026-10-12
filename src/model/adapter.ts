import { record, recordError } from '../core/diagnostics';
import type {
  AudioModelAdapter,
  ProcessingRequest,
  ProcessingResult,
} from '../core/types';
export class WorkerAdapter implements AudioModelAdapter {
  onFatal: (message: string) => void = () => {};
  private worker: Worker | null = null;
  private counter = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private lastProgressUiMs = Number.NEGATIVE_INFINITY;
  private lastProgressLogMs = Number.NEGATIVE_INFINITY;
  private lastWatchMs = Number.NEGATIVE_INFINITY;
  private watch() {
    // Several ONNX files may report thousands of progress messages per second.
    // One watchdog reset each second is enough and avoids timer churn.
    const now = performance.now();
    if (this.timer && now - this.lastWatchMs < 1000) return;
    this.lastWatchMs = now;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      const message =
        'Het model reageert vier minuten niet meer. Exporteer de logs en probeer opnieuw.';
      recordError('model_timeout', Error(message));
      this.unload();
      this.onFatal(message);
    }, 240000);
  }
  private pending = new Map<
    number,
    {
      resolve: (value: unknown) => void;
      reject: (reason: Error) => void;
      progress?: (label: string, percent?: number) => void;
    }
  >();
  private create() {
    this.worker = new Worker(
      new URL('./inference.worker.ts', import.meta.url),
      { type: 'module' },
    );
    this.worker.onmessage = ({ data }) => {
      const p = this.pending.get(data.id);
      if (!p) return;
      this.watch();
      if (data.diagnostic) {
        record('model_stage', data.diagnostic);
        return;
      }
      if (data.progress) {
        const now = performance.now();
        if (now - this.lastProgressLogMs >= 2000) {
          record('model_progress', { percent: data.progress.percent ?? -1 });
          this.lastProgressLogMs = now;
        }
        if (now - this.lastProgressUiMs >= 200) {
          p.progress?.(data.progress.label, data.progress.percent);
          this.lastProgressUiMs = now;
        }
        return;
      }
      clearTimeout(this.timer);
      this.pending.delete(data.id);
      if (data.error) {
        recordError('model_worker', Error(data.error));
        p.reject(Error(data.error));
      } else p.resolve(data.result);
    };
    this.worker.onerror = (event) => {
      for (const p of this.pending.values())
        p.reject(
          Error(
            event.message ||
              'Modelworker gestopt door de browser. Controleer geheugen en runtimeondersteuning.',
          ),
        );
      this.pending.clear();
      this.unload();
      this.onFatal(
        event.message || 'De modelworker is gestopt. Laad het model opnieuw.',
      );
    };
  }
  private call<T>(
    data: object,
    transfers: Transferable[] = [],
    progress?: (label: string, percent?: number) => void,
  ): Promise<T> {
    if (!this.worker) this.create();
    const id = ++this.counter;
    return new Promise((resolve, reject) => {
      this.pending.set(id, {
        resolve: (result) => resolve(result as T),
        reject,
        progress,
      });
      this.watch();
      this.worker!.postMessage({ id, ...data }, transfers);
    });
  }
  async load(
    modelId: string,
    provider: 'webgpu',
    download: boolean,
    progress: (label: string, percent?: number) => void,
    installOnly = false,
  ) {
    this.unload();
    await this.call(
      { type: 'load', modelId, provider, download, installOnly },
      [],
      progress,
    );
  }
  process(request: ProcessingRequest): Promise<ProcessingResult> {
    if (!this.worker)
      return Promise.reject(Error('Het model is niet geladen.'));
    return this.call({ type: 'process', request }, [
      request.audio.pcm.buffer as ArrayBuffer,
    ]);
  }
  unload() {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.lastWatchMs = Number.NEGATIVE_INFINITY;
    this.lastProgressLogMs = Number.NEGATIVE_INFINITY;
    this.lastProgressUiMs = Number.NEGATIVE_INFINITY;
    this.worker?.terminate();
    this.worker = null;
    for (const p of this.pending.values())
      p.reject(Error('Model gestopt; onverwerkte audio is gewist.'));
    this.pending.clear();
  }
}
