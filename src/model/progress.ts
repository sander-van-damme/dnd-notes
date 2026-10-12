export interface ModelFileProgress {
  status: string;
  file?: string;
  progress?: number;
}

const pinnedOnnxFile =
  /^onnx\/(?:audio_encoder|embed_tokens|decoder_model_merged|vision_encoder)_(?:q2f16|fp16)\.onnx(?:_data)?$/;

// Transformers.js emits interleaved callbacks for parallel model files. Keep
// reliable file-boundary checkpoints, but send ordinary percentages at most
// four times per second instead of flooding the page's message queue.
export function modelProgressReporter(
  progress: (value: ModelFileProgress) => void,
  checkpoint: (phase: string, asset: string) => void,
  now: () => number = () => performance.now(),
) {
  let lastSent = Number.NEGATIVE_INFINITY;
  const milestones = new Set<string>();

  return (event: ModelFileProgress) => {
    if (
      event.file &&
      pinnedOnnxFile.test(event.file) &&
      (event.status === 'initiate' || event.status === 'done')
    ) {
      const key = `${event.status}:${event.file}`;
      if (!milestones.has(key)) {
        milestones.add(key);
        checkpoint(
          event.status === 'initiate' ? 'onnx-file-start' : 'onnx-file-read',
          event.file,
        );
      }
    }
    const timestamp = now();
    if (timestamp - lastSent >= 250 || event.status === 'done') {
      lastSent = timestamp;
      progress(event);
    }
  };
}
