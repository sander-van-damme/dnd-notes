export type Thinking = 'off' | 'on';
export type Protocol = 'markers' | 'json';
export type Strategy = 'direct' | 'two-pass';
export interface Note {
  id: string;
  text: string;
  revision: number;
  edited: boolean;
  uncertain: boolean;
  startMs?: number;
  endMs?: number;
}
export interface Scene {
  id: string;
  revision: number;
  notes: Note[];
  final: boolean;
}
export interface Session {
  id: string;
  campaignId: string;
  title: string;
  createdAt: string;
  scenes: Scene[];
  processed: string[];
  conflicts: { id: string; text: string; sceneId: string }[];
}
export interface Campaign {
  id: string;
  name: string;
  glossary: string[];
  description?: string;
}
export interface JournalEvent {
  seq: number;
  at: string;
  type: string;
  sessionId?: string;
}
export interface Run {
  id: string;
  at: string;
  model: string;
  revision: string;
  provider: string;
  dtype: string;
  thinking: Thinking;
  strategy: Strategy;
  protocol: Protocol;
  mode: 'realtime' | 'throughput';
  inputHash: string;
  audioMs: number;
  processingMs: number;
  elapsedMs: number;
  chunks: number;
  failed: number;
  lagMs: number[];
  userAgent: string;
  reference?: string;
  score?: number;
  cold: boolean;
  settings: SegmentSettings;
  maxTokens: number;
  contextChars: number;
  status: 'completed' | 'cancelled' | 'failed';
}
export interface AppState {
  schema: 1;
  version: number;
  campaigns: Campaign[];
  sessions: Session[];
  runs: Run[];
  journal: JournalEvent[];
}
export interface ParsedOutput {
  facts: { text: string; uncertain: boolean }[];
  transcript: string;
  unparsed: boolean;
  endScene: boolean;
}
export interface Proposal {
  requestId: string;
  sessionId: string;
  sceneId: string;
  baseRevision: number;
  startMs: number;
  endMs: number;
  output: ParsedOutput;
}
export interface InputAudio {
  pcm: Float32Array;
  sampleRate: number;
  startMs: number;
  endMs: number;
}
export interface SegmentSettings {
  chunkSeconds: number;
  silenceMs: number;
  threshold: number;
  overlapMs: number;
  preRollMs: number;
}
export interface InferenceSettings {
  thinking: Thinking;
  strategy: Strategy;
  protocol: Protocol;
  maxTokens: number;
  contextChars: number;
}
export interface ProcessingRequest extends InferenceSettings {
  audio: InputAudio;
  context: string;
}
export interface ProcessingResult {
  rawText: string;
  transcript: string;
  totalMs: number;
  inputTokens: number;
  outputTokens: number;
}
export interface AudioModelAdapter {
  load(
    modelId: string,
    provider: 'webgpu',
    download: boolean,
    progress: (label: string, percent?: number) => void,
  ): Promise<void>;
  process(request: ProcessingRequest): Promise<ProcessingResult>;
  unload(): void;
}
