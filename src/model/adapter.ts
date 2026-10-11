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
  private lastStage = '';
  private watch() {
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
        const stage = `${data.progress.label}:${Math.floor((data.progress.percent ?? 0) / 10)}`;
        if (stage !== this.lastStage) {
          record('model_progress', {
            stage: data.progress.label,
            percent: data.progress.percent ?? -1,
          });
          this.lastStage = stage;
        }
        p.progress?.(data.progress.label, data.progress.percent);
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
    this.worker?.terminate();
    this.worker = null;
    for (const p of this.pending.values())
      p.reject(Error('Model gestopt; onverwerkte audio is gewist.'));
    this.pending.clear();
  }
}
