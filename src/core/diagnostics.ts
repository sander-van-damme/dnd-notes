export interface Diagnostic {
  seq: number;
  at: string;
  monotonicMs: number;
  type: string;
  data: Record<string, number | boolean | string>;
}

interface SavedRun {
  build: string;
  runId: string;
  startedAt: string;
  lastAt: string;
  phase: 'idle' | 'loading' | 'processing' | 'ready';
  closed: boolean;
  events: Diagnostic[];
}
interface SavedJournal {
  version: 1;
  active: SavedRun;
  previous: SavedRun[];
}

const JOURNAL_KEY = 'dnd-notulist:crash-journal-v1';
const MAX_EVENTS = 1000;
const MAX_SAVED_EVENTS = 100;
const MAX_PREVIOUS_RUNS = 2;
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const build = import.meta.env.VITE_BUILD_COMMIT || 'development';
const events: Diagnostic[] = [];
let seq = 0;
let persistence: 'available' | 'unavailable' | 'write-failed' = 'unavailable';
let previousRuns: SavedRun[] = [];
const run: SavedRun = {
  build,
  runId: globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36),
  startedAt: new Date().toISOString(),
  lastAt: new Date().toISOString(),
  phase: 'idle',
  closed: false,
  events: [],
};

// Only explicitly allowed TECHNICAL fields reach durable storage. In particular
// never persist error messages, prompts, file uploads, audio or note contents.
const savedFields: Record<string, readonly string[]> = {
  app_start: ['isolated'],
  app_pagehide: ['status'],
  offline_ready: ['controlled'],
  model_load: ['model', 'provider'],
  model_stage: ['phase', 'asset', 'ms', 'bytes', 'source'],
  model_ready: ['model'],
  model_failure: ['name'],
  model_unload: [],
  model_progress: ['percent'],
  inference_start: ['startMs', 'endMs'],
  inference_done: ['totalMs', 'inputTokens', 'outputTokens'],
  error: ['stage', 'name'],
  storage_state: ['reason', 'persisted', 'quota', 'usage'],
  storage_persist: ['result'],
  pwa_state: [
    'reason',
    'display',
    'controlled',
    'active',
    'waiting',
    'installing',
  ],
  pwa_installable: [],
  pwa_installed: [],
  gpu_state: ['webgpu', 'fp16', 'adapter'],
  memory_state: ['source', 'bytes', 'jsHeapLimit'],
  worker_heartbeat: ['elapsedMs'],
};
const safePhases = new Set([
  'prepare-start',
  'cache-check',
  'cache-ok',
  'cache-corrupt',
  'download-start',
  'download-ok',
  'download-failed',
  'prepare-ready',
  'processor-start',
  'processor-ready',
  'onnx-start',
  'onnx-ready',
  'process-start',
  'process-ready',
  'load-failed',
]);
const safeStatus = new Set([
  'idle',
  'loading',
  'ready',
  'listening',
  'paused',
  'testing',
  'stopping',
]);
const safeReason = new Set([
  'startup',
  'load',
  'export',
  'download',
  'model-ready',
]);
const safeSource = new Set([
  'cache',
  'network',
  'unsupported',
  'performance-memory',
  'user-agent-memory',
]);
const safeDisplay = new Set([
  'browser',
  'standalone',
  'fullscreen',
  'minimal-ui',
]);
const safeResult = new Set([
  'granted',
  'denied',
  'already-granted',
  'unsupported',
  'error',
]);
const safeAdapter = /^[a-zA-Z0-9_-]{1,40}$/;
const safeAsset = /^(?:onnx\/)?[a-z0-9_.-]{1,72}$/;
const safeModel = /^[a-z0-9_-]{1,32}$/;

function safeEvent(event: Diagnostic): Diagnostic | null {
  const fields = savedFields[event.type];
  if (!fields) return null;
  const data: Diagnostic['data'] = {};
  for (const key of fields) {
    const value = event.data[key];
    if (typeof value === 'boolean') data[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value))
      data[key] = Math.round(value * 100) / 100;
    else if (typeof value === 'string') {
      const valid =
        (key === 'phase' && safePhases.has(value)) ||
        (key === 'status' && safeStatus.has(value)) ||
        (key === 'reason' && safeReason.has(value)) ||
        (key === 'source' && safeSource.has(value)) ||
        (key === 'display' && safeDisplay.has(value)) ||
        (key === 'result' && safeResult.has(value)) ||
        (key === 'asset' && safeAsset.test(value)) ||
        (key === 'adapter' && safeAdapter.test(value)) ||
        (key === 'model' && safeModel.test(value)) ||
        (key === 'provider' && value === 'webgpu') ||
        (key === 'name' &&
          /^(?:Error|TypeError|RangeError|DOMException|AbortError)$/.test(
            value,
          )) ||
        (key === 'stage' && /^[a-z_-]{1,32}$/.test(value));
      if (valid) data[key] = value;
    }
  }
  return { ...event, data };
}

try {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(JOURNAL_KEY);
    persistence = 'available';
    if (stored) {
      const parsed = JSON.parse(stored) as SavedJournal;
      if (parsed.version === 1 && Array.isArray(parsed.previous)) {
        const candidates = [parsed.active, ...parsed.previous];
        previousRuns = candidates
          .filter(
            (item): item is SavedRun =>
              !!item &&
              typeof item.lastAt === 'string' &&
              Number.isFinite(Date.parse(item.lastAt)) &&
              Date.now() - Date.parse(item.lastAt) < SEVEN_DAYS &&
              Array.isArray(item.events),
          )
          .slice(0, MAX_PREVIOUS_RUNS);
      }
    }
  }
} catch {
  // Logging is best-effort. An inaccessible or corrupt journal must never
  // stop the offline app, model loading, or notes.
  persistence = 'unavailable';
}

function persist() {
  if (persistence === 'unavailable' || typeof localStorage === 'undefined')
    return;
  try {
    const journal: SavedJournal = {
      version: 1,
      active: { ...run, events: run.events.slice(-MAX_SAVED_EVENTS) },
      previous: previousRuns,
    };
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(journal));
    persistence = 'available';
  } catch {
    persistence = 'write-failed';
  }
}

// Regular events remain in memory for detailed logs. Only a small allowlisted
// breadcrumb journal is synchronously persisted, so it survives renderer death.
export function record(
  type: string,
  data: Record<string, number | boolean | string> = {},
) {
  const event: Diagnostic = {
    seq: ++seq,
    at: new Date().toISOString(),
    monotonicMs: performance.now(),
    type,
    data,
  };
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();

  const saved = safeEvent(event);
  if (!saved) return;
  run.events.push(saved);
  if (run.events.length > MAX_SAVED_EVENTS) run.events.shift();
  run.lastAt = event.at;
  if (type === 'model_load') run.phase = 'loading';
  if (type === 'inference_start') run.phase = 'processing';
  if (type === 'model_ready' || type === 'inference_done') run.phase = 'ready';
  if (type === 'model_failure' || type === 'model_unload') run.phase = 'idle';
  if (type === 'app_pagehide') run.closed = true;
  persist();
}

export const diagnostics = () => ({
  schema: 2,
  build,
  privacy: 'metadata-only; no audio, transcripts or notes',
  userAgent: navigator.userAgent,
  events: [...events],
  previousRuns: previousRuns.map((saved) => ({
    ...saved,
    outcome: saved.closed
      ? 'pagehide-recorded'
      : saved.phase === 'loading' || saved.phase === 'processing'
        ? 'interrupted-while-busy'
        : 'unknown',
  })),
  journal: {
    state: persistence,
    historyRuns: previousRuns.length,
    maxEventsPerRun: MAX_SAVED_EVENTS,
    note: 'An interrupted run is not proof of a browser crash. Last writes can be lost.',
  },
});

export function download(name: string, text: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const percentile = (values: number[], p: number) =>
  values.length
    ? [...values].sort((a, b) => a - b)[
        Math.min(values.length - 1, Math.floor(values.length * p))
      ]
    : null;
export function glossaryCandidates(
  text: string,
): { word: string; count: number; example: string }[] {
  const counts = new Map<
    string,
    { word: string; count: number; example: string }
  >();
  const stop = new Set([
    'De',
    'Het',
    'Een',
    'We',
    'Wij',
    'Ik',
    'Toen',
    'Daar',
    'Hij',
    'Zij',
    'Ze',
    'En',
    'Maar',
    'Dat',
    'Dit',
    'Na',
    'In',
    'Op',
    'The',
    'Dungeon Master',
  ]);
  for (const match of text.matchAll(
    /\b[\p{Lu}][\p{L}'’-]{2,}(?:\s[\p{Lu}][\p{L}'’-]{2,}){0,2}/gu,
  )) {
    const word = match[0];
    if (stop.has(word)) continue;
    const old = counts.get(word.toLocaleLowerCase());
    counts.set(word.toLocaleLowerCase(), {
      word,
      count: (old?.count ?? 0) + 1,
      example: text.slice(
        Math.max(0, match.index - 25),
        match.index + word.length + 45,
      ),
    });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 60);
}

export function recordError(stage: string, error: unknown) {
  const message = (error instanceof Error ? error.message : String(error))
    .replace(/https?:\/\/[^\s]+/g, '[URL]')
    .slice(0, 1500);
  record('error', {
    stage,
    message,
    name: error instanceof Error ? error.name : 'Error',
  });
}
