import type {
  AudioModelAdapter,
  ProcessingRequest,
  ProcessingResult,
} from '../core/types';
export class WorkerAdapter implements AudioModelAdapter {
  onFatal: (message: string) => void = () => {};
  private worker: Worker | null = null;
  private counter = 0;
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
      if (data.progress) {
        p.progress?.(data.progress.label, data.progress.percent);
        return;
      }
      this.pending.delete(data.id);
      if (data.error) p.reject(Error(data.error));
      else p.resolve(data.result);
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
      this.worker!.postMessage({ id, ...data }, transfers);
    });
  }
  async load(
    modelId: string,
    provider: 'webgpu' | 'wasm',
    download: boolean,
    progress: (label: string, percent?: number) => void,
  ) {
    this.unload();
    await this.call(
      { type: 'load', modelId, provider, download },
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
    this.worker?.terminate();
    this.worker = null;
    for (const p of this.pending.values())
      p.reject(Error('Model gestopt; onverwerkte audio is gewist.'));
    this.pending.clear();
  }
}
