import { describe, expect, it } from 'vitest';
import {
  activeScene,
  contextFor,
  initialState,
  markdown,
  reduce,
} from './state';
import { parseOutput, finalText } from './output';
import type { Proposal } from './types';
function setup() {
  let state = reduce(initialState(), {
    type: 'campaign',
    id: 'c',
    name: 'Testcampagne',
  });
  state = reduce(state, {
    type: 'session',
    id: 's',
    sceneId: 'scene',
    campaignId: 'c',
    title: 'De poort',
  });
  return state;
}
const proposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  requestId: 'r',
  sessionId: 's',
  sceneId: 'scene',
  baseRevision: 0,
  startMs: 0,
  endMs: 2000,
  output: {
    facts: [{ text: 'De poort is gesloten.', uncertain: false }],
    transcript: '',
    unparsed: false,
    endScene: false,
  },
  ...overrides,
});
describe('single writer / menselijke correcties', () => {
  it('past een nieuw feit eenmaal toe en bewaart broninterval', () => {
    const state = reduce(setup(), { type: 'proposal', proposal: proposal() });
    expect(activeScene(state.sessions[0]).notes[0]).toMatchObject({
      text: 'De poort is gesloten.',
      startMs: 0,
      endMs: 2000,
    });
    expect(reduce(state, { type: 'proposal', proposal: proposal() })).toBe(
      state,
    );
  });
  it('parkeert een laat resultaat na een menselijke bewerking', () => {
    let state = reduce(setup(), {
      type: 'add',
      sessionId: 's',
      sceneId: 'scene',
      noteId: 'n',
      text: 'Correcte naam',
    });
    const revision = activeScene(state.sessions[0]).revision;
    state = reduce(state, {
      type: 'edit',
      sessionId: 's',
      sceneId: 'scene',
      noteId: 'n',
      text: 'Eldrin',
    });
    state = reduce(state, {
      type: 'proposal',
      proposal: proposal({ baseRevision: revision }),
    });
    expect(activeScene(state.sessions[0]).notes.map((n) => n.text)).toEqual([
      'Eldrin',
    ]);
    expect(state.sessions[0].conflicts).toHaveLength(1);
  });
  it('verandert een afgeronde scène nooit via AI', () => {
    let state = reduce(setup(), {
      type: 'finalize',
      sessionId: 's',
      nextSceneId: 'next',
    });
    state = reduce(state, { type: 'proposal', proposal: proposal() });
    expect(state.sessions[0].scenes[0].notes).toHaveLength(0);
    expect(state.sessions[0].conflicts).toHaveLength(1);
    state = reduce(state, {
      type: 'resolve',
      sessionId: 's',
      conflictId: 'r:0',
      accept: true,
    });
    expect(activeScene(state.sessions[0]).notes[0].edited).toBe(true);
  });
  it('behoudt gebruikerscorrecties bij verschillende interleavings', () => {
    for (let count = 1; count < 50; count++) {
      let state = reduce(setup(), {
        type: 'add',
        sessionId: 's',
        sceneId: 'scene',
        noteId: 'human',
        text: 'origineel',
      });
      for (let i = 0; i < count; i++) {
        state = reduce(state, {
          type: 'edit',
          sessionId: 's',
          sceneId: 'scene',
          noteId: 'human',
          text: `correctie ${i}`,
        });
        state = reduce(state, {
          type: 'proposal',
          proposal: proposal({ requestId: `r${i}`, baseRevision: i }),
        });
      }
      expect(
        activeScene(state.sessions[0]).notes.find((n) => n.id === 'human')
          ?.text,
      ).toBe(`correctie ${count - 1}`);
    }
  });
  it('dedupliceert identieke feiten uit overlap zonder tekst te herschrijven', () => {
    let state = reduce(setup(), { type: 'proposal', proposal: proposal() });
    state = reduce(state, {
      type: 'proposal',
      proposal: proposal({ requestId: 'second', baseRevision: 1 }),
    });
    expect(activeScene(state.sessions[0]).notes).toHaveLength(1);
  });
  it('geeft correcties prioriteit in begrensde context en exporteert Markdown', () => {
    const state = reduce(setup(), {
      type: 'add',
      sessionId: 's',
      sceneId: 'scene',
      noteId: 'n',
      text: 'Eldrin',
    });
    const text = contextFor(state, state.sessions[0], 'x'.repeat(9000), 120);
    expect(text).toContain('Eldrin');
    expect(text.length).toBeLessThanOrEqual(120);
    expect(markdown(state.sessions[0], 'Campagne')).toContain('- Eldrin');
  });
});
describe('ongestructureerde en verborgen uitvoer', () => {
  it('verwijdert complete én afgebroken reasoningblokken', () => {
    expect(finalText('<think>geheim</think>FACT: zichtbaar')).toBe(
      'FACT: zichtbaar',
    );
    expect(finalText('<|channel>thought\nFACT: verborgen')).toBe('');
    expect(
      finalText('<|channel>thought\nverborgen<channel|>FACT: zichtbaar'),
    ).toBe('FACT: zichtbaar');
  });
  it('parset alleen expliciete secties en markeert onleesbare output', () => {
    const result = parseOutput(
      'FACT: De sleutel is weg.\nUNCERTAIN: Mogelijk gestolen.\nVrije fantasie',
      'markers',
    );
    expect(result.facts).toHaveLength(2);
    expect(result.facts[1].uncertain).toBe(true);
    expect(result.unparsed).toBe(true);
  });
  it('faalt veilig bij foutieve JSON en ongeldige schemas', () => {
    expect(parseOutput('{facts: nope}', 'json').facts).toEqual([]);
    expect(parseOutput('{"facts":[{"text":"onzeker"}]}', 'json')).toMatchObject(
      { facts: [], unparsed: true },
    );
    expect(
      parseOutput(
        '{"facts":[{"text":"De deur sluit.","uncertain":false}]}',
        'json',
      ).facts,
    ).toHaveLength(1);
  });
});
