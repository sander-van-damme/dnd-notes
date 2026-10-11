export interface Diagnostic {
  seq: number;
  at: string;
  monotonicMs: number;
  type: string;
  data: Record<string, number | boolean | string>;
}
const events: Diagnostic[] = [];
let seq = 0;
// Callers only submit technical metadata. Never raw exceptions, text, file names or audio.
export function record(
  type: string,
  data: Record<string, number | boolean | string> = {},
) {
  events.push({
    seq: ++seq,
    at: new Date().toISOString(),
    monotonicMs: performance.now(),
    type,
    data,
  });
  if (events.length > 1000) events.shift();
}
export const diagnostics = () => ({
  schema: 1,
  privacy: 'metadata-only; no audio, transcripts or notes',
  userAgent: navigator.userAgent,
  events: [...events],
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
