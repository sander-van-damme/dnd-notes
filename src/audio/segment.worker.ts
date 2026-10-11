import { Segmenter } from './segmenter';
import type { InputAudio } from '../core/types';
let segmenter: Segmenter;
self.onmessage = ({ data }) => {
  if (data.type === 'init')
    segmenter = new Segmenter(data.settings, (audio: InputAudio) =>
      self.postMessage(
        { type: 'segment', audio },
        { transfer: [audio.pcm.buffer as ArrayBuffer] },
      ),
    );
  else if (data.type === 'frame') segmenter.push(data.pcm, data.startMs);
  else if (data.type === 'flush') {
    segmenter.flush();
    self.postMessage({ type: 'flushed' });
  } else if (data.type === 'reset') segmenter.reset();
  if (data.ack !== undefined) self.postMessage({ type: 'ack', ack: data.ack });
};
