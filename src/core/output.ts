import type { ParsedOutput, Protocol } from './types';
export function finalText(raw: string): string {
  // Drop incomplete thought blocks too: never turn hidden reasoning into a note.
  return raw
    .replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '')
    .replace(/<\|channel>thought[\s\S]*?(?:<channel\|>|$)/g, '')
    .replace(/<\|[^>]*>|<[^<]*\|>/g, '')
    .trim();
}
export function parseOutput(raw: string, protocol: Protocol): ParsedOutput {
  const text = finalText(raw),
    result: ParsedOutput = {
      facts: [],
      transcript: '',
      unparsed: false,
      endScene: false,
    };
  if (protocol === 'json') {
    try {
      const data = JSON.parse(
        text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, ''),
      );
      if (!data || !Array.isArray(data.facts)) throw Error('schema');
      for (const fact of data.facts.slice(0, 30)) {
        if (
          typeof fact?.text !== 'string' ||
          typeof fact.uncertain !== 'boolean' ||
          !fact.text.trim()
        ) {
          result.unparsed = true;
          continue;
        }
        result.facts.push({
          text: fact.text.trim().slice(0, 2000),
          uncertain: fact.uncertain,
        });
      }
      result.transcript =
        typeof data.transcript === 'string'
          ? data.transcript.slice(0, 6000)
          : '';
      result.endScene = data.endScene === true;
    } catch {
      result.unparsed = true;
    }
  } else {
    for (const line of text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)) {
      const match = /^(FACT|UNCERTAIN|TRANSCRIPT|END_SCENE):\s*(.*)$/.exec(
        line,
      );
      if (!match) {
        result.unparsed = true;
        continue;
      }
      const [, tag, value] = match;
      if (tag === 'TRANSCRIPT') result.transcript += value.slice(0, 6000) + ' ';
      else if (tag === 'END_SCENE')
        result.endScene = /^(yes|true|ja)$/i.test(value);
      else if (value && result.facts.length < 30)
        result.facts.push({
          text: value.slice(0, 2000),
          uncertain: tag === 'UNCERTAIN',
        });
    }
  }
  if (!result.facts.length && !result.transcript.trim()) result.unparsed = true;
  return result;
}
