// Bounded, streaming box-filter resampling. No recording APIs or persistent audio.
class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frame = new Float32Array(320);
    this.index = 0;
    this.sum = 0;
    this.count = 0;
    this.phase = 0;
    this.samples = 0;
  }
  process(inputs) {
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let sample = 0;
      for (const channel of channels) sample += channel[i] / channels.length;
      this.sum += sample;
      this.count++;
      this.phase += 16000;
      if (this.phase >= sampleRate) {
        this.phase -= sampleRate;
        this.frame[this.index++] = this.sum / this.count;
        this.sum = 0;
        this.count = 0;
        if (this.index === 320) {
          this.port.postMessage(
            { pcm: this.frame, startMs: this.samples / 16 },
            [this.frame.buffer],
          );
          this.samples += 320;
          this.frame = new Float32Array(320);
          this.index = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('dnd-capture', CaptureProcessor);
