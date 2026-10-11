import type { AppState, Proposal, Run, Session } from './types';
export const id = () => crypto.randomUUID();
export const initialState = (): AppState => ({
  schema: 1,
  version: 0,
  campaigns: [],
  sessions: [],
  runs: [],
  journal: [],
});
export const activeScene = (session: Session) =>
  session.scenes.find((s) => !s.final)!;
export type Action =
  | { type: 'campaign'; id: string; name: string }
  | { type: 'campaign-edit'; id: string; name: string; description: string }
  | { type: 'glossary'; campaignId: string; words: string[] }
  | {
      type: 'session';
      id: string;
      sceneId: string;
      campaignId: string;
      title: string;
    }
  | {
      type: 'edit';
      sessionId: string;
      sceneId: string;
      noteId: string;
      text: string;
    }
  | {
      type: 'add';
      sessionId: string;
      sceneId: string;
      noteId: string;
      text: string;
    }
  | { type: 'proposal'; proposal: Proposal }
  | { type: 'resolve'; sessionId: string; conflictId: string; accept: boolean }
  | { type: 'finalize'; sessionId: string; nextSceneId: string }
  | { type: 'delete-session'; sessionId: string }
  | { type: 'run'; run: Run };
export function reduce(state: AppState, action: Action): AppState {
  const next = structuredClone(state);
  if (action.type === 'proposal') {
    const p = action.proposal,
      session = next.sessions.find((s) => s.id === p.sessionId);
    if (!session || session.processed.includes(p.requestId)) return state;
    session.processed.push(p.requestId);
    const scene = session.scenes.find((s) => s.id === p.sceneId);
    if (!scene) return state;
    for (const [i, fact] of p.output.facts.entries()) {
      if (
        scene.notes.some(
          (n) =>
            n.text.trim().toLocaleLowerCase() ===
            fact.text.trim().toLocaleLowerCase(),
        )
      )
        continue;
      const noteId = `${p.requestId}:${i}`;
      if (scene.final || scene.revision !== p.baseRevision)
        session.conflicts.push({
          id: noteId,
          text: fact.text,
          sceneId: scene.id,
        });
      else
        scene.notes.push({
          id: noteId,
          text: fact.text,
          revision: 0,
          edited: false,
          uncertain: fact.uncertain,
          startMs: p.startMs,
          endMs: p.endMs,
        });
    }
    scene.revision++;
  } else if (action.type === 'campaign') {
    if (!action.name.trim()) return state;
    next.campaigns.push({
      id: action.id,
      name: action.name.trim().slice(0, 100),
      glossary: [],
    });
  } else if (action.type === 'campaign-edit') {
    const campaign = next.campaigns.find((c) => c.id === action.id);
    if (campaign && action.name.trim()) {
      campaign.name = action.name.trim().slice(0, 100);
      campaign.description = action.description.trim().slice(0, 1000);
    }
  } else if (action.type === 'glossary') {
    const c = next.campaigns.find((c) => c.id === action.campaignId);
    if (c)
      c.glossary = [
        ...new Set(action.words.map((w) => w.trim()).filter(Boolean)),
      ].slice(0, 200);
  } else if (action.type === 'session') {
    if (!next.campaigns.some((c) => c.id === action.campaignId)) return state;
    next.sessions.unshift({
      id: action.id,
      title: action.title.trim().slice(0, 120) || 'Nieuw avontuur',
      campaignId: action.campaignId,
      createdAt: new Date().toISOString(),
      scenes: [{ id: action.sceneId, revision: 0, notes: [], final: false }],
      processed: [],
      conflicts: [],
    });
  } else if (action.type === 'delete-session') {
    next.sessions = next.sessions.filter((s) => s.id !== action.sessionId);
  } else if (action.type === 'run') {
    next.runs = [
      action.run,
      ...next.runs.filter((r) => r.id !== action.run.id),
    ].slice(0, 100);
  } else {
    const session = next.sessions.find((s) => s.id === action.sessionId);
    if (!session) return state;
    if (action.type === 'finalize') {
      activeScene(session).final = true;
      session.scenes.push({
        id: action.nextSceneId,
        revision: 0,
        notes: [],
        final: false,
      });
    } else if (action.type === 'resolve') {
      const conflict = session.conflicts.find(
        (c) => c.id === action.conflictId,
      );
      if (conflict && action.accept) {
        const scene = activeScene(session);
        scene.notes.push({
          id: conflict.id,
          text: conflict.text,
          edited: true,
          revision: 0,
          uncertain: true,
        });
        scene.revision++;
      }
      session.conflicts = session.conflicts.filter(
        (c) => c.id !== action.conflictId,
      );
    } else {
      const scene = session.scenes.find((s) => s.id === action.sceneId);
      if (!scene) return state;
      if (action.type === 'add')
        scene.notes.push({
          id: action.noteId,
          text: action.text,
          edited: true,
          uncertain: false,
          revision: 0,
        });
      else {
        const note = scene.notes.find((n) => n.id === action.noteId);
        if (!note) return state;
        note.text = action.text;
        note.edited = true;
        note.uncertain = false;
        note.revision++;
      }
      scene.revision++;
    }
  }
  next.version++;
  next.journal.push({
    seq: next.version,
    at: new Date().toISOString(),
    type: action.type,
    sessionId:
      'sessionId' in action
        ? action.sessionId
        : action.type === 'proposal'
          ? action.proposal.sessionId
          : undefined,
  });
  next.journal = next.journal.slice(-1000);
  return next;
}
export function contextFor(
  state: AppState,
  session: Session,
  recent: string,
  budget: number,
): string {
  const scene = activeScene(session);
  const glossary =
    state.campaigns.find((c) => c.id === session.campaignId)?.glossary ?? [];
  const relevant = glossary
    .filter((w) =>
      `${recent} ${scene.notes.map((n) => n.text).join(' ')}`
        .toLocaleLowerCase()
        .includes(w.toLocaleLowerCase()),
    )
    .slice(0, 20);
  const parts = [
    `Spelling: ${relevant.join(', ')}`,
    `Menselijke correcties (leidend):\n${scene.notes
      .filter((n) => n.edited)
      .map((n) => n.text)
      .join('\n')}`,
    `Actuele scène:\n${scene.notes
      .slice(-15)
      .map((n) => n.text)
      .join('\n')}`,
    `Recent transcript (tijdelijk):\n${recent.slice(-2000)}`,
    `Eerdere scènes:\n${session.scenes
      .filter((s) => s.final)
      .slice(-2)
      .flatMap((s) => s.notes.map((n) => n.text))
      .join('\n')}`,
  ];
  return parts.join('\n\n').slice(0, Math.max(0, budget));
}
export function markdown(session: Session, campaignName: string): string {
  return (
    `# ${session.title}\n\n${campaignName} · ${session.createdAt.slice(0, 10)}\n\n` +
    session.scenes
      .map(
        (s, i) =>
          `## Scène ${i + 1}${s.final ? '' : ' (voorlopig)'}\n\n${s.notes
            .filter((n) => n.text.trim())
            .map(
              (n) =>
                `- ${n.uncertain ? '[Onzeker] ' : ''}${n.text.replaceAll('\n', '\n  ')}`,
            )
            .join('\n')}`,
      )
      .join('\n\n')
  );
}
