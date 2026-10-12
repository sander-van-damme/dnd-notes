import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const key = 'dnd-notulist:crash-journal-v1';
let saved = new Map<string, string>();
function storage() {
  return {
    getItem: (k: string) => saved.get(k) ?? null,
    setItem: (k: string, v: string) => {
      saved.set(k, v);
    },
    removeItem: (k: string) => {
      saved.delete(k);
    },
  };
}
beforeEach(() => {
  saved = new Map();
  vi.stubGlobal('localStorage', storage());
  vi.stubGlobal('navigator', { userAgent: 'test-chrome' });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

it('persists a bounded model-loading breadcrumb without user-supplied content', async () => {
  vi.resetModules();
  const { record, diagnostics } = await import('./diagnostics');
  record('model_load', { model: 'gemma4', provider: 'webgpu' });
  record('model_stage', { phase: 'onnx-start', asset: 'onnx/decoder_model_merged_q2f16.onnx' });
  record('error', { stage: 'model_load', name: 'Error', message: 'Secret campaign name' });
  const serialized = saved.get(key)!;
  expect(serialized).toContain('onnx-start');
  expect(serialized).not.toContain('Secret campaign name');
  expect(diagnostics().schema).toBe(2);
  vi.resetModules();
  const next = await import('./diagnostics');
  expect(next.diagnostics().previousRuns[0].outcome).toBe('interrupted-while-busy');
  expect(next.diagnostics().previousRuns[0].events).toHaveLength(3);
});

it('does not persist unexpected fields or arbitrary filenames', async () => {
  vi.resetModules();
  const { record } = await import('./diagnostics');
  record('model_stage', {
    phase: 'onnx-start',
    asset: 'users/private campaign document.txt',
    transcript: 'Never save this',
  });
  expect(saved.get(key)).not.toContain('Never save this');
  expect(saved.get(key)).not.toContain('private campaign');
});

it('keeps functioning when browser storage throws', async () => {
  vi.stubGlobal('localStorage', {
    getItem: () => { throw Error('blocked'); },
    setItem: () => { throw Error('blocked'); },
  });
  vi.resetModules();
  const { record, diagnostics } = await import('./diagnostics');
  expect(() => record('model_load', { model: 'gemma4' })).not.toThrow();
  expect(diagnostics().journal.state).toBe('unavailable');
});
