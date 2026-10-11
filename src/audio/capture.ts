import type { InputAudio } from '../core/types';
export async function startMicrophone(
  frame: (audio: InputAudio) => void,
  ended: () => void,
) {
  if (!navigator.mediaDevices?.getUserMedia)
    throw Error('Microfoon vereist HTTPS en een ondersteunde browser.');
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: 1,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
    video: false,
  });
  const context = new AudioContext();
  try {
    await context.audioWorklet.addModule('/capture-worklet.js');
    const source = context.createMediaStreamSource(stream),
      node = new AudioWorkletNode(context, 'dnd-capture'),
      mute = context.createGain();
    mute.gain.value = 0;
    source.connect(node);
    node.connect(mute);
    mute.connect(context.destination);
    node.port.onmessage = ({ data }) =>
      frame({
        ...data,
        endMs: data.startMs + data.pcm.length / 16,
        sampleRate: 16000,
      });
    for (const track of stream.getTracks()) track.onended = ended;
    await context.resume();
    return async () => {
      node.port.onmessage = null;
      node.disconnect();
      source.disconnect();
      for (const track of stream.getTracks()) {
        track.onended = null;
        track.stop();
      }
      await context.close();
    };
  } catch (e) {
    stream.getTracks().forEach((t) => t.stop());
    await context.close();
    throw e;
  }
}
export async function decodeFile(file: File): Promise<Float32Array> {
  if (file.size > 80 * 1024 * 1024)
    throw Error(
      'Dit bestand is groter dan 80 MB. Kies een korter fragment om het werkgeheugen te beschermen.',
    );
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await file.arrayBuffer());
    if (audio.duration > 1800)
      throw Error('Kies een fragment van maximaal 30 minuten.');
    const offline = new OfflineAudioContext(
      1,
      Math.ceil(audio.duration * 16000),
      16000,
    );
    const source = offline.createBufferSource();
    source.buffer = audio;
    source.connect(offline.destination);
    source.start();
    return (await offline.startRendering()).getChannelData(0);
  } finally {
    await context.close();
  }
}
