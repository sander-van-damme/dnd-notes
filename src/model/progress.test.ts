import { expect, it, vi } from 'vitest';
import { modelProgressReporter } from './progress';

it('limits a large progress burst while preserving ONNX file checkpoints', () => {
  const delivered = vi.fn();
  const stages = vi.fn();
  let clock = 0;
  const notify = modelProgressReporter(delivered, stages, () => clock);
  const file = 'onnx/decoder_model_merged_q2f16.onnx_data';
  notify({ status: 'initiate', file });
  for (let i = 0; i < 15000; i++) {
    clock += 0.01;
    notify({ status: 'progress', file, progress: i % 100 });
  }
  expect(delivered.mock.calls.length).toBe(1);
  expect(stages).toHaveBeenCalledWith('onnx-file-start', file);
  notify({ status: 'done', file, progress: 100 });
  expect(delivered.mock.calls.length).toBe(2);
  expect(stages).toHaveBeenCalledWith('onnx-file-read', file);
  notify({ status: 'done', file });
  expect(stages.mock.calls.length).toBe(2);
});

it('never persists filenames that are not pinned ONNX asset names', () => {
  const stages = vi.fn();
  const notify = modelProgressReporter(vi.fn(), stages, () => 0);
  notify({ status: 'initiate', file: 'private/campaign-recording.wav' });
  notify({ status: 'done', file: 'private/campaign-recording.wav' });
  expect(stages).not.toHaveBeenCalled();
});
