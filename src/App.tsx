import {
  useEffect,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from 'react';
import {
  BookOpen,
  Plus,
  Mic,
  Pause,
  Square,
  Download,
  Check,
  ChevronRight,
  FlaskConical,
  Cpu,
  Users,
  ShieldCheck,
  WifiOff,
  AlertTriangle,
  X,
  Trash2,
  Feather,
  Play,
  Settings2,
  HardDrive,
  CircleHelp,
  Dices,
  Menu,
} from 'lucide-react';
import { store } from './core/store';
import { activeScene, id, markdown } from './core/state';
import { Engine } from './core/engine';
import {
  cacheStatus,
  capabilities,
  clearModelCache,
  dtypeLabel,
  modelById,
  models,
  RUNTIME_VERSION,
} from './model/catalog';
import { defaultSegments } from './audio/segmenter';
import {
  diagnostics,
  download,
  glossaryCandidates,
  percentile,
  record,
} from './core/diagnostics';
import type {
  InferenceSettings,
  Note,
  Run,
  Scene,
  SegmentSettings,
  Session,
} from './core/types';
import type { Action } from './core/state';
const engine = new Engine(store);
const defaults: InferenceSettings = {
  thinking: 'off',
  strategy: 'two-pass',
  protocol: 'markers',
  maxTokens: 384,
  contextChars: 6000,
};
type Page = 'sessions' | 'models' | 'test' | 'campaigns';
const labels: Record<Page, string> = {
  sessions: 'Avonturenboek',
  models: 'Lokale modellen',
  test: 'Testlaboratorium',
  campaigns: 'Campagnes',
};
const icons = {
  sessions: BookOpen,
  models: Cpu,
  test: FlaskConical,
  campaigns: Users,
};
function Button({
  children,
  onClick,
  disabled = false,
  kind = 'primary',
  type = 'button',
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  type?: 'button' | 'submit';
  title?: string;
}) {
  return (
    <button
      type={type}
      className={`button ${kind}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}
function Empty({
  icon: Icon = BookOpen,
  title,
  children,
}: {
  icon?: typeof BookOpen;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={30} />
      </div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}
function AudioPreview({ file }: { file: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const local = URL.createObjectURL(file);
    setUrl(local);
    return () => URL.revokeObjectURL(local);
  }, [file]);
  return (
    <audio
      className="audio-preview"
      controls
      preload="none"
      src={url || undefined}
      aria-label="Beluister het lokale testfragment"
    />
  );
}
function NoteEditor({
  note,
  scene,
  session,
  dispatch,
}: {
  note: Note;
  scene: Scene;
  session: Session;
  dispatch: (action: Action) => void;
}) {
  return (
    <div className={`note ${note.uncertain ? 'uncertain' : ''}`}>
      <span className="note-dot" />
      <div className="note-body">
        <textarea
          aria-label="Notitie bewerken"
          value={note.text}
          rows={Math.max(2, Math.ceil(note.text.length / 95))}
          onChange={(e) =>
            dispatch({
              type: 'edit',
              sessionId: session.id,
              sceneId: scene.id,
              noteId: note.id,
              text: e.target.value,
            })
          }
        />
        <div className="note-meta">
          {note.edited ? (
            <>
              <Feather size={12} /> Door jou bewerkt
            </>
          ) : note.uncertain ? (
            <>
              <CircleHelp size={12} /> Onzeker · controleer deze notitie
            </>
          ) : (
            <>
              <Check size={12} /> Modelvoorstel
            </>
          )}
          {note.startMs !== undefined && (
            <span>
              {Math.floor(note.startMs / 60000)}:
              {String(Math.floor(note.startMs / 1000) % 60).padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
function RunCard({ run }: { run: Run }) {
  const rtf = run.audioMs ? run.processingMs / run.audioMs : 0;
  return (
    <article className="run-card">
      <div className="section-heading">
        <div>
          <strong>{run.model.split('/').at(-1)}</strong>
          <p>
            {new Date(run.at).toLocaleString('nl-BE')} ·{' '}
            {run.mode === 'realtime'
              ? 'Realtime simulatie'
              : 'Maximale throughput'}{' '}
            · {run.cold ? 'Eerste run na laden' : 'Warme run'}
          </p>
        </div>
        <span
          className={`badge ${run.status === 'completed' && run.chunks ? 'green' : 'amber'}`}
        >
          {run.chunks === 0
            ? 'Geen spraak verwerkt'
            : run.status === 'completed'
              ? 'Voltooid'
              : run.status === 'cancelled'
                ? 'Gestopt'
                : 'Met fouten'}
        </span>
      </div>
      <div className="metrics">
        <div>
          <strong>{rtf.toFixed(2)}×</strong>
          <span>Verwerktijd / audio</span>
        </div>
        <div>
          <strong>{run.chunks}</strong>
          <span>Fragmenten · {run.failed} mislukt</span>
        </div>
        <div>
          <strong>
            {run.mode === 'realtime' && run.lagMs.length
              ? `${((percentile(run.lagMs, 0.95) ?? 0) / 1000).toFixed(1)} s`
              : '—'}
          </strong>
          <span>p95 notitievertraging</span>
        </div>
      </div>
      <details>
        <summary>Configuratie en reproduceerbaarheid</summary>
        <dl>
          <dt>Modelrevisie</dt>
          <dd>{run.revision}</dd>
          <dt>Runtime</dt>
          <dd>
            Transformers.js {RUNTIME_VERSION} · {run.provider}
          </dd>
          <dt>Quantisatie</dt>
          <dd>{run.dtype}</dd>
          <dt>Strategie</dt>
          <dd>
            {run.strategy} · {run.protocol} · thinking {run.thinking}
          </dd>
          <dt>Input SHA-256 (PCM)</dt>
          <dd>{run.inputHash}</dd>
          <dt>Fragmenten / overlap</dt>
          <dd>
            {run.settings.chunkSeconds} s / {run.settings.overlapMs} ms
          </dd>
          <dt>Doorlooptijd</dt>
          <dd>{(run.elapsedMs / 1000).toFixed(1)} s</dd>
          <dt>Menselijke beoordeling</dt>
          <dd>
            {run.score === undefined ? 'Nog niet beoordeeld' : `${run.score}/5`}
          </dd>
        </dl>
      </details>
    </article>
  );
}
export default function App() {
  const state = useSyncExternalStore(store.subscribe, store.snapshot);
  const [page, setPage] = useState<Page>('sessions'),
    [view, setView] = useState(engine.view);
  const [sessionId, setSessionId] = useState(''),
    [campaignId, setCampaignId] = useState('');
  const [modal, setModal] = useState<'session' | 'campaign' | null>(null),
    [title, setTitle] = useState(''),
    [newCampaign, setNewCampaign] = useState('');
  const [error, setError] = useState(''),
    [online, setOnline] = useState(navigator.onLine),
    [shellReady, setShellReady] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemma4'),
    [provider, setProvider] = useState<'webgpu' | 'wasm'>('webgpu');
  const [caps, setCaps] = useState<Awaited<ReturnType<typeof capabilities>>>(),
    [cache, setCache] = useState<{ id: string; files: number }[]>([]);
  const [settings, updateSettings] = useState<InferenceSettings>(defaults),
    [segments, updateSegments] = useState<SegmentSettings>(defaultSegments);
  const setSettings = (value: InferenceSettings) => {
    engine.invalidateQuality();
    updateSettings(value);
  };
  const setSegments = (value: SegmentSettings) => {
    engine.invalidateQuality();
    updateSegments(value);
  };
  const [file, setFile] = useState<File>(),
    [mode, setMode] = useState<'realtime' | 'throughput'>('throughput'),
    [consent, setConsent] = useState(false);
  const [sourceText, setSourceText] = useState(''),
    [newWord, setNewWord] = useState(''),
    [mobileNav, setMobileNav] = useState(false),
    [reference, setReference] = useState(''),
    [score, setScore] = useState('');
  const busy = [
    'listening',
    'paused',
    'testing',
    'stopping',
    'loading',
  ].includes(view.status);
  const visibleSessions = state.sessions.filter(
    (s) => !campaignId || s.campaignId === campaignId,
  );
  const session =
    visibleSessions.find((s) => s.id === sessionId) ?? visibleSessions[0];
  const campaign =
    state.campaigns.find((c) => c.id === (campaignId || session?.campaignId)) ??
    state.campaigns[0];
  const spec = modelById(selectedModel);
  const act = (action: Action) => {
    void store.dispatch(action).catch((e) => {
      setError(e.message);
      engine.cancel();
    });
  };
  const attempt = (fn: () => Promise<void>) => {
    setError('');
    void fn().catch((e) =>
      setError(e instanceof Error ? e.message : 'Actie mislukt.'),
    );
  };
  useEffect(() => {
    engine.onChange = setView;
    if (!store.ready) void store.init();
    void capabilities()
      .then(setCaps)
      .catch(() =>
        setError('Browsermogelijkheden konden niet worden gecontroleerd.'),
      );
    void cacheStatus()
      .then(setCache)
      .catch(() =>
        setError('Modelcache is niet beschikbaar. Controleer browseropslag.'),
      );
    const network = () => setOnline(navigator.onLine),
      visibility = () => {
        if (document.hidden) engine.background();
      };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (
        store.pending > 0 ||
        ['listening', 'testing', 'stopping'].includes(engine.view.status)
      ) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    document.addEventListener('visibilitychange', visibility);
    const message = (e: MessageEvent) => {
      if (e.data?.type === 'OFFLINE_READY') setShellReady(true);
    };
    navigator.serviceWorker?.addEventListener('message', message);
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/sw.js')
        .then(async () => {
          const registration = await navigator.serviceWorker.ready;
          setShellReady(!!registration.active);
          record('offline_ready');
        })
        .catch(() =>
          setError('De app kon niet voor offline gebruik worden opgeslagen.'),
        );
    }
    record('app_start');
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
      document.removeEventListener('visibilitychange', visibility);
      navigator.serviceWorker?.removeEventListener('message', message);
    };
  }, []);
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModal(null);
      if (event.key !== 'Tab') return;
      const controls = [
        ...document.querySelectorAll<HTMLElement>(
          '[role="dialog"] button, [role="dialog"] input, [role="dialog"] select',
        ),
      ].filter((el) => !(el as HTMLButtonElement).disabled);
      const first = controls[0],
        last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [modal]);
  function openSession() {
    setTitle('');
    setNewCampaign('');
    setModal('session');
  }
  function create(e: FormEvent) {
    e.preventDefault();
    attempt(async () => {
      let cid = campaign?.id;
      if (modal === 'campaign' || !cid) {
        cid = id();
        await store.dispatch({ type: 'campaign', id: cid, name: newCampaign });
        setCampaignId(cid);
      }
      if (modal === 'session') {
        const sid = id();
        await store.dispatch({
          type: 'session',
          id: sid,
          sceneId: id(),
          campaignId: cid!,
          title,
        });
        setSessionId(sid);
        setPage('sessions');
      }
      setModal(null);
    });
  }
  async function load(downloadModel: boolean) {
    if (downloadModel) {
      const estimate = await navigator.storage?.estimate();
      if (
        estimate?.quota &&
        estimate.quota - (estimate.usage ?? 0) < spec.estimatedGB * 1e9
      )
        throw Error(
          'Er lijkt onvoldoende browseropslag vrij. Maak ruimte vrij voordat je dit model downloadt.',
        );
      await navigator.storage?.persist();
    }
    await engine.load(selectedModel, provider, downloadModel);
    setCache(await cacheStatus());
  }
  const errorText = store.error || error || view.error;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? 'open' : ''}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage('sessions');
          }}
        >
          <img src="/icon.svg" alt="" />
          <span>
            Notulist<small>JOUW AVONTURENBOEK</small>
          </span>
        </a>
        <div className="sidebar-rule" />
        <div className="nav-caption">AAN DE SPEELTAFEL</div>
        <nav aria-label="Hoofdnavigatie">
          {(Object.keys(labels) as Page[]).map((key) => {
            const Icon = icons[key];
            return (
              <button
                key={key}
                aria-current={page === key ? 'page' : undefined}
                className={page === key ? 'nav-item active' : 'nav-item'}
                onClick={() => {
                  setPage(key);
                  setMobileNav(false);
                }}
              >
                <Icon size={19} />
                {labels[key]}
                {page === key && <ChevronRight size={15} />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mark">
            <ShieldCheck size={20} />
            <div>
              <strong>Jouw verhaal blijft van jou.</strong>
              <p>Audio en AI blijven op dit toestel.</p>
            </div>
          </div>
          <div className="version">LOKAAL · PRIVÉ · VERSIE 0.1</div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-menu"
            aria-label="Menu openen"
            onClick={() => setMobileNav(!mobileNav)}
          >
            <Menu />
          </button>
          <div className="breadcrumb">
            Mijn tafel <ChevronRight size={13} />
            <strong>{labels[page]}</strong>
          </div>
          <div className="top-status">
            <span className={`status-dot ${online ? '' : 'offline'}`} />
            {online ? 'Op dit toestel' : 'Offline'}
            <span className="avatar">D20</span>
          </div>
        </header>
        <main>
          {errorText && (
            <div className="alert error" role="alert">
              <AlertTriangle size={20} />
              <div>
                <strong>Dit vraagt je aandacht</strong>
                <p>{errorText}</p>
              </div>
              <button
                aria-label="Melding sluiten"
                onClick={() => {
                  setError('');
                  engine.clearError();
                }}
              >
                <X size={17} />
              </button>
            </div>
          )}
          {view.warning && (
            <div className="alert" role="status">
              <AlertTriangle size={19} />
              <p>{view.warning}</p>
            </div>
          )}
          {!online && (
            <div className="alert">
              <WifiOff size={18} />
              <p>
                Je bent offline. Je notities blijven beschikbaar. AI werkt
                wanneer alle modelbestanden al op dit toestel staan.
              </p>
            </div>
          )}
          {page === 'sessions' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">VAN DOBBELSTEEN TOT VERHAAL</div>
                  <h1>
                    Jouw avonturenboek<span>.</span>
                  </h1>
                  <p>Beleef het avontuur. Bewaar wat ertoe doet.</p>
                </div>
                <Button onClick={openSession} disabled={busy || !store.ready}>
                  <Plus size={17} /> Nieuwe sessie
                </Button>
              </div>
              <div className="session-layout">
                <section className="session-list panel">
                  <div className="panel-label">
                    SESSIES <span>{state.sessions.length}</span>
                  </div>
                  {state.campaigns.length > 0 && (
                    <label className="compact-label">
                      Campagne
                      <select
                        value={campaign?.id ?? ''}
                        disabled={busy}
                        onChange={(e) => setCampaignId(e.target.value)}
                      >
                        {state.campaigns.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {state.sessions.filter(
                    (s) => !campaign || s.campaignId === campaign.id,
                  ).length === 0 ? (
                    <div className="list-empty">
                      <Dices size={27} />
                      <p>
                        Elk avontuur begint
                        <br />
                        met een eerste sessie.
                      </p>
                    </div>
                  ) : (
                    state.sessions
                      .filter((s) => !campaign || s.campaignId === campaign.id)
                      .map((s) => (
                        <button
                          disabled={busy}
                          className={`session-item ${session?.id === s.id ? 'selected' : ''}`}
                          key={s.id}
                          onClick={() => setSessionId(s.id)}
                        >
                          <BookOpen size={16} />
                          <span>
                            <strong>{s.title}</strong>
                            <small>
                              {new Date(s.createdAt).toLocaleDateString(
                                'nl-BE',
                                { day: 'numeric', month: 'long' },
                              )}{' '}
                              ·{' '}
                              {s.scenes.reduce(
                                (n, s) =>
                                  n +
                                  s.notes.filter((n) => n.text.trim()).length,
                                0,
                              )}{' '}
                              notities
                            </small>
                          </span>
                          <ChevronRight size={14} />
                        </button>
                      ))
                  )}
                  <div className="list-footer">
                    <HardDrive size={14} /> Alleen opgeslagen in deze browser
                  </div>
                </section>
                <div className="session-main">
                  {!session ? (
                    <section className="panel welcome">
                      <div className="welcome-art">
                        <div className="orbit orbit-one" />
                        <div className="orbit orbit-two" />
                        <img src="/icon.svg" alt="" />
                        <span className="star star-one">✦</span>
                        <span className="star star-two">✧</span>
                      </div>
                      <div className="eyebrow">
                        EEN LEGE BLADZIJDE, EINDELOZE VERHALEN
                      </div>
                      <h2>Wat wordt jullie volgende avontuur?</h2>
                      <p>
                        Maak een campagne en een sessie aan. Schrijf zelf mee,
                        of laat een lokaal model helpen om de belangrijke
                        momenten vast te leggen.
                      </p>
                      <Button onClick={openSession} disabled={!store.ready}>
                        <Plus size={17} /> Begin je eerste sessie
                      </Button>
                      <div className="welcome-features">
                        <span>
                          <ShieldCheck size={16} /> Geen audio-opnames
                        </span>
                        <span>
                          <Feather size={16} /> Altijd zelf bewerkbaar
                        </span>
                      </div>
                    </section>
                  ) : (
                    <>
                      <section className="panel session-title">
                        <div>
                          <span className="eyebrow">
                            {
                              state.campaigns.find(
                                (c) => c.id === session.campaignId,
                              )?.name
                            }
                          </span>
                          <h2>{session.title}</h2>
                          <span className="subtle">
                            {new Date(session.createdAt).toLocaleDateString(
                              'nl-BE',
                              {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              },
                            )}
                          </span>
                        </div>
                        <div className="button-row">
                          <Button
                            kind="ghost"
                            title="Exporteer sessienotities"
                            onClick={() =>
                              download(
                                'sessienotities.md',
                                markdown(
                                  session,
                                  state.campaigns.find(
                                    (c) => c.id === session.campaignId,
                                  )?.name ?? '',
                                ),
                                'text/markdown',
                              )
                            }
                          >
                            <Download size={17} /> Export
                          </Button>
                          <Button
                            kind="ghost"
                            title="Sessie verwijderen"
                            disabled={busy}
                            onClick={() => {
                              if (
                                confirm(
                                  'Deze sessie en alle bijbehorende notities verwijderen?',
                                )
                              )
                                act({
                                  type: 'delete-session',
                                  sessionId: session.id,
                                });
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </section>
                      <section className="panel notes-panel">
                        <div className="section-heading">
                          <h3>
                            <BookOpen size={18} /> Afgeronde notities
                          </h3>
                          <span className="badge">Jij houdt de pen vast</span>
                        </div>
                        {session.scenes.filter((s) => s.final).length ? (
                          session.scenes
                            .filter((s) => s.final)
                            .map((scene, i) => (
                              <div className="scene" key={scene.id}>
                                <div className="scene-label">
                                  SCÈNE {i + 1}
                                  <span>Afgerond</span>
                                </div>
                                {scene.notes.map((note) => (
                                  <NoteEditor
                                    key={note.id}
                                    {...{ note, scene, session, dispatch: act }}
                                  />
                                ))}
                              </div>
                            ))
                        ) : (
                          <div className="quiet-empty">
                            <Feather size={23} />
                            <p>Hier groeit het verhaal van jullie sessie.</p>
                            <small>
                              Rond een scène af om je notities hier te bewaren.
                            </small>
                          </div>
                        )}
                      </section>
                      <section className="panel notes-panel current">
                        <div className="section-heading">
                          <h3>
                            <span className="live-dot" /> Lopende scène
                          </h3>
                          <span className="badge amber">Voorlopig</span>
                        </div>
                        {activeScene(session).notes.map((note) => (
                          <NoteEditor
                            key={note.id}
                            note={note}
                            scene={activeScene(session)}
                            session={session}
                            dispatch={act}
                          />
                        ))}
                        {!activeScene(session).notes.length && (
                          <p className="subtle scene-prompt">
                            Wie ontmoeten jullie? Wat verandert er? Leg het
                            eerste moment vast.
                          </p>
                        )}
                        <div className="button-row">
                          <Button
                            kind="ghost"
                            disabled={!store.ready}
                            onClick={() =>
                              act({
                                type: 'add',
                                sessionId: session.id,
                                sceneId: activeScene(session).id,
                                noteId: id(),
                                text: '',
                              })
                            }
                          >
                            <Plus size={16} /> Zelf een notitie toevoegen
                          </Button>
                          <Button
                            kind="secondary"
                            disabled={
                              !activeScene(session).notes.some((n) =>
                                n.text.trim(),
                              )
                            }
                            onClick={() =>
                              act({
                                type: 'finalize',
                                sessionId: session.id,
                                nextSceneId: id(),
                              })
                            }
                          >
                            <Check size={16} /> Scène afronden
                          </Button>
                        </div>
                      </section>
                      {session.conflicts.length > 0 && (
                        <section className="panel">
                          <h3>Voorstellen na jouw bewerking</h3>
                          <p className="subtle">
                            Deze resultaten kwamen binnen nadat de scène
                            veranderde. Kies wat je wilt toevoegen.
                          </p>
                          {session.conflicts.map((c) => (
                            <div className="conflict" key={c.id}>
                              <p>{c.text}</p>
                              <div className="button-row">
                                <Button
                                  kind="secondary"
                                  onClick={() =>
                                    act({
                                      type: 'resolve',
                                      sessionId: session.id,
                                      conflictId: c.id,
                                      accept: true,
                                    })
                                  }
                                >
                                  Toevoegen aan lopende scène
                                </Button>
                                <Button
                                  kind="ghost"
                                  onClick={() =>
                                    act({
                                      type: 'resolve',
                                      sessionId: session.id,
                                      conflictId: c.id,
                                      accept: false,
                                    })
                                  }
                                >
                                  Verwerpen
                                </Button>
                              </div>
                            </div>
                          ))}
                        </section>
                      )}
                      <section className="recorder">
                        <div className="recorder-top">
                          <div
                            className={`mic-icon ${view.status === 'listening' ? 'recording' : ''}`}
                          >
                            <Mic size={23} />
                          </div>
                          <div>
                            <strong>
                              {view.status === 'listening'
                                ? 'Aan het luisteren'
                                : view.status === 'paused'
                                  ? 'Opname gepauzeerd'
                                  : view.processing
                                    ? 'Notities verwerken'
                                    : 'Een extra paar oren aan tafel'}
                            </strong>
                            <p>
                              {view.backlogMs > 0
                                ? `${(view.backlogMs / 1000).toFixed(0)} seconden audio in de wachtrij`
                                : view.verified
                                  ? `${modelById(engine.modelId).name} · verwerking op dit toestel`
                                  : 'Stel eerst een lokaal model in en test het op jouw toestel.'}
                            </p>
                          </div>
                          {view.status === 'listening' && (
                            <div className="level" aria-label="Microfoonniveau">
                              <i style={{ width: `${view.level * 100}%` }} />
                            </div>
                          )}
                        </div>
                        {!busy && (
                          <label className="checkbox">
                            <input
                              type="checkbox"
                              checked={consent}
                              onChange={(e) => setConsent(e.target.checked)}
                            />{' '}
                            Mijn tafelgenoten weten dat de microfoon
                            meeluistert. Audio wordt uitsluitend in het
                            werkgeheugen verwerkt.
                          </label>
                        )}
                        <div className="button-row">
                          {['listening', 'paused'].includes(view.status) ? (
                            <>
                              <Button
                                onClick={() =>
                                  attempt(() =>
                                    view.status === 'listening'
                                      ? engine.pause()
                                      : engine.resume(),
                                  )
                                }
                              >
                                {view.status === 'listening' ? (
                                  <Pause size={17} />
                                ) : (
                                  <Play size={17} />
                                )}{' '}
                                {view.status === 'listening'
                                  ? 'Pauzeren'
                                  : 'Verder luisteren'}
                              </Button>
                              <Button
                                kind="secondary"
                                onClick={() => attempt(() => engine.stop())}
                              >
                                <Square size={15} /> Stoppen en verwerken
                              </Button>
                            </>
                          ) : view.status === 'stopping' ? (
                            <span>Resterende fragmenten verwerken…</span>
                          ) : (
                            <Button
                              disabled={!view.verified || !consent || busy}
                              onClick={() =>
                                attempt(() =>
                                  engine.start(session.id, settings, segments),
                                )
                              }
                            >
                              <Mic size={17} /> Start luisteren
                            </Button>
                          )}
                          {!view.verified && (
                            <Button
                              kind="ghost"
                              onClick={() => setPage('models')}
                            >
                              Model instellen <ChevronRight size={16} />
                            </Button>
                          )}
                          {busy && (
                            <Button
                              kind="ghost"
                              onClick={() => engine.cancel()}
                            >
                              Direct stoppen en audio wissen
                            </Button>
                          )}
                        </div>
                        <small>
                          Houd deze pagina op de voorgrond. Bij herladen gaat
                          onverwerkte audio verloren.
                        </small>
                      </section>
                    </>
                  )}
                  <div className="privacy-footer">
                    <ShieldCheck size={15} />
                    <span>
                      Geen account. Geen cloud-AI. Jouw notities blijven in deze
                      browser.
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
          {page === 'models' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">INTELLIGENTIE OP JOUW TOESTEL</div>
                  <h1>
                    Een lokale tafelgenoot<span>.</span>
                  </h1>
                  <p>
                    Download één model, test het en ga daarna offline verder.
                  </p>
                </div>
              </div>
              <div className="info-strip">
                <ShieldCheck size={23} />
                <p>
                  Alleen modelbestanden worden gedownload. Audio en notities
                  worden nooit naar een AI-dienst gestuurd. Downloads kunnen
                  meerdere gigabytes groot zijn.
                </p>
              </div>
              <div className="two-columns">
                {models.map((m) => (
                  <button
                    className={`model-card panel ${selectedModel === m.id ? 'chosen' : ''}`}
                    disabled={busy || view.loaded}
                    key={m.id}
                    onClick={() => {
                      setSelectedModel(m.id);
                      setSettings({ ...settings, thinking: 'off' });
                    }}
                  >
                    <div className="model-card-top">
                      <Cpu size={28} />
                      <span className="badge">
                        {m.id === 'gemma4'
                          ? 'Eerste kandidaat'
                          : 'Vergelijkingsmodel'}
                      </span>
                    </div>
                    <h2>{m.name}</h2>
                    <p>{m.description}</p>
                    <dl>
                      <dt>Downloadbudget</dt>
                      <dd>circa {m.estimatedGB} GB</dd>
                      <dt>Audiofragment</dt>
                      <dd>max. {m.maxAudioSeconds} s · 16 kHz</dd>
                      <dt>Lokale cache</dt>
                      <dd>
                        {cache.find((c) => c.id === m.id)?.files ?? 0} bestanden
                      </dd>
                    </dl>
                    <div className="model-card-bottom">
                      <span>
                        {selectedModel === m.id
                          ? 'Geselecteerd'
                          : 'Selecteer model'}
                      </span>
                      {selectedModel === m.id ? (
                        <Check size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <section className="panel">
                <div className="section-heading">
                  <h3>Maak {spec.name} klaar</h3>
                  <span className="badge">
                    Transformers.js {RUNTIME_VERSION}
                  </span>
                </div>
                <div className="settings-grid">
                  <label>
                    Uitvoering
                    <select
                      value={provider}
                      disabled={busy || view.loaded}
                      onChange={(e) =>
                        setProvider(e.target.value as 'webgpu' | 'wasm')
                      }
                    >
                      <option value="webgpu">
                        WebGPU · grafische processor
                      </option>
                      <option value="wasm">
                        WebAssembly · CPU (experimenteel, langzaam)
                      </option>
                    </select>
                  </label>
                  <div className="capability">
                    <span
                      className={`status-dot ${caps?.webgpu ? '' : 'offline'}`}
                    />
                    <span>
                      {caps?.webgpu
                        ? 'WebGPU-adapter gevonden'
                        : 'Geen WebGPU-adapter gevonden'}
                      <small>
                        {caps?.fp16
                          ? '16-bit GPU-berekeningen beschikbaar'
                          : 'Gemma WebGPU vereist shader-f16'}
                      </small>
                    </span>
                  </div>
                </div>
                <p className="subtle">
                  {dtypeLabel(selectedModel, provider)}. Downloadgrootte is geen
                  maat voor benodigd werkgeheugen. Cachebestanden alleen
                  bewijzen nog geen offline gereedheid.
                </p>
                <div className="button-row">
                  <Button
                    disabled={
                      busy ||
                      view.loaded ||
                      !online ||
                      (provider === 'webgpu' &&
                        (!caps?.webgpu ||
                          (selectedModel === 'gemma4' && !caps?.fp16)))
                    }
                    onClick={() => attempt(() => load(true))}
                  >
                    <Download size={17} /> Downloaden en laden
                  </Button>
                  <Button
                    kind="secondary"
                    disabled={
                      busy ||
                      view.loaded ||
                      (provider === 'webgpu' && !caps?.webgpu)
                    }
                    onClick={() => attempt(() => load(false))}
                  >
                    <HardDrive size={17} /> Laden uit lokale cache
                  </Button>
                  {(view.loaded || view.status === 'loading') && (
                    <Button kind="ghost" onClick={() => engine.cancel()}>
                      Model ontladen / annuleren
                    </Button>
                  )}
                </div>
                {view.status === 'loading' && (
                  <div className="progress-area" role="status">
                    <progress max={100} value={view.percent} />
                    <p>{view.progress}</p>
                  </div>
                )}
                {view.loaded && (
                  <div className="success">
                    <Check size={18} />
                    <span>
                      Model geladen.{' '}
                      {view.verified
                        ? 'De gecontroleerde configuratie is beschikbaar voor sessies.'
                        : 'Voer een korte audiotest uit en controleer de notities.'}
                    </span>
                    <Button kind="ghost" onClick={() => setPage('test')}>
                      Naar testmodus <ChevronRight size={16} />
                    </Button>
                  </div>
                )}
                <details>
                  <summary>Modelherkomst en licentie</summary>
                  <dl>
                    <dt>Repository</dt>
                    <dd>{spec.repo}</dd>
                    <dt>Vaste revisie</dt>
                    <dd>{spec.revision}</dd>
                    <dt>Licentie</dt>
                    <dd>{spec.license}</dd>
                  </dl>
                  <a
                    href={`https://huggingface.co/${spec.repo}/tree/${spec.revision}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Modelbestanden en voorwaarden bekijken ↗
                  </a>
                </details>
              </section>
              <section className="panel storage-panel">
                <div>
                  <h3>
                    <HardDrive size={18} /> Opslag op dit toestel
                  </h3>
                  <p>
                    {caps?.storage?.quota
                      ? `${((caps.storage.usage ?? 0) / 1e9).toFixed(2)} GB gebruikt van ${(caps.storage.quota / 1e9).toFixed(1)} GB beschikbaar browserquotum.`
                      : 'Je browser bepaalt de beschikbare opslagruimte.'}{' '}
                    De browser kan bestanden verwijderen bij ruimtegebrek.
                  </p>
                  <p>
                    {shellReady
                      ? 'App-shell offline opgeslagen. Test modelherstart afzonderlijk zonder netwerk.'
                      : 'De app-shell is nog niet bevestigd voor offline gebruik. Offline caching werkt in de productiebuild.'}
                  </p>
                </div>
                <Button
                  kind="secondary"
                  disabled={busy || view.loaded}
                  onClick={() => {
                    if (
                      confirm(
                        'Alle gedownloade modellen wissen? Je sessienotities blijven bewaard.',
                      )
                    )
                      attempt(async () => {
                        await clearModelCache();
                        setCache(await cacheStatus());
                      });
                  }}
                >
                  <Trash2 size={16} /> Modelcache wissen
                </Button>
              </section>
              <p className="footnote">
                Voxtral en andere engines zijn toekomstige adapters. Geen van
                deze modellen heeft hier een bewezen realtime- of geheugenbudget
                op Pixel 6a.
              </p>
            </>
          )}
          {page === 'test' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">EERST METEN, DAN VERTROUWEN</div>
                  <h1>
                    Test aan jouw tafel<span>.</span>
                  </h1>
                  <p>
                    Vergelijk kwaliteit en snelheid met een eigen audiofragment.
                  </p>
                </div>
                <Button
                  kind="secondary"
                  onClick={() =>
                    download(
                      'diagnostiek.json',
                      JSON.stringify(diagnostics(), null, 2),
                      'application/json',
                    )
                  }
                >
                  <Download size={17} /> Diagnostiek
                </Button>
              </div>
              {!view.loaded && (
                <div className="info-strip">
                  <Cpu size={21} />
                  <p>
                    Laad eerst een model bij Lokale modellen. Testen gebruikt
                    dezelfde audiopipeline als een live sessie.
                  </p>
                  <Button kind="ghost" onClick={() => setPage('models')}>
                    Model kiezen <ChevronRight size={16} />
                  </Button>
                </div>
              )}
              <section className="panel">
                <div className="section-heading">
                  <h3>
                    <FlaskConical size={19} /> Nieuwe proef
                  </h3>
                  <span className="badge">Audio blijft in RAM</span>
                </div>
                <label className="file-drop">
                  <div className="file-icon">
                    <Download size={24} />
                  </div>
                  <strong>
                    {file ? file.name : 'Kies een lokaal audiofragment'}
                  </strong>
                  <span>
                    WAV, MP3 of een ander browserondersteund formaat · max. 80
                    MB / 30 min.
                  </span>
                  <input
                    type="file"
                    accept="audio/*"
                    aria-label="Audiofragment kiezen"
                    disabled={busy}
                    onChange={(e) => setFile(e.target.files?.[0])}
                  />
                </label>
                {file && <AudioPreview file={file} />}
                <p className="footnote">
                  Gebruik materiaal waarvoor je toestemming hebt. Begin met
                  10–30 seconden. Het bestand wordt niet geüpload of in de app
                  opgeslagen; na herladen kies je het opnieuw.
                </p>
                <div className="settings-grid">
                  <label>
                    Tempo
                    <select
                      value={mode}
                      disabled={busy}
                      onChange={(e) => setMode(e.target.value as typeof mode)}
                    >
                      <option value="throughput">Maximale throughput</option>
                      <option value="realtime">
                        Realtime simulatie (inclusief stiltes)
                      </option>
                    </select>
                  </label>
                  <label>
                    Taakstrategie
                    <select
                      value={settings.strategy}
                      disabled={busy || view.verified}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          strategy: e.target
                            .value as InferenceSettings['strategy'],
                        })
                      }
                    >
                      <option value="two-pass">
                        Transcript → notities (hetzelfde model)
                      </option>
                      <option value="direct">
                        Audio → notities (één aanroep)
                      </option>
                    </select>
                  </label>
                  <label>
                    Uitvoerformaat
                    <select
                      value={settings.protocol}
                      disabled={busy || view.verified}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          protocol: e.target
                            .value as InferenceSettings['protocol'],
                        })
                      }
                    >
                      <option value="markers">Korte sectiemarkers</option>
                      <option value="json">Compact JSON</option>
                    </select>
                  </label>
                  <label>
                    Thinking
                    <select
                      value={settings.thinking}
                      disabled={
                        busy ||
                        view.verified ||
                        !modelById(engine.modelId).thinking
                      }
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          thinking: e.target
                            .value as InferenceSettings['thinking'],
                        })
                      }
                    >
                      <option value="off">Uit</option>
                      {modelById(engine.modelId).thinking && (
                        <option value="on">Aan (Gemma)</option>
                      )}
                    </select>
                  </label>
                </div>
                <details className="advanced">
                  <summary>
                    <Settings2 size={16} /> Fragmenten en context
                  </summary>
                  <div className="settings-grid">
                    <label>
                      Maximale fragmentduur (s)
                      <input
                        type="number"
                        min={2}
                        max={30}
                        value={segments.chunkSeconds}
                        disabled={busy || view.verified}
                        onChange={(e) =>
                          setSegments({
                            ...segments,
                            chunkSeconds: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Stilte voor fragmentgrens (ms)
                      <input
                        type="number"
                        min={100}
                        max={2000}
                        step={100}
                        value={segments.silenceMs}
                        disabled={busy || view.verified}
                        onChange={(e) =>
                          setSegments({
                            ...segments,
                            silenceMs: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Overlap (ms)
                      <input
                        type="number"
                        min={0}
                        max={2000}
                        step={100}
                        value={segments.overlapMs}
                        disabled={busy || view.verified}
                        onChange={(e) =>
                          setSegments({
                            ...segments,
                            overlapMs: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Energie-VAD drempel
                      <input
                        type="number"
                        min={0.001}
                        max={0.2}
                        step={0.001}
                        value={segments.threshold}
                        disabled={busy || view.verified}
                        onChange={(e) =>
                          setSegments({
                            ...segments,
                            threshold: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Uitvoertokens per aanroep
                      <input
                        type="number"
                        min={64}
                        max={1024}
                        step={64}
                        value={settings.maxTokens}
                        disabled={busy || view.verified}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            maxTokens: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Contextbudget (tekens, schatting)
                      <input
                        type="number"
                        min={0}
                        max={16000}
                        step={500}
                        value={settings.contextChars}
                        disabled={busy || view.verified}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            contextChars: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                  </div>
                  <p className="footnote">
                    Energie-VAD is een meetbare baseline. Silero, adaptieve
                    thinking en echte tokenizerbudgetten zijn nog niet
                    geïmplementeerd. Ontlaad het model om een bevestigde
                    configuratie te wijzigen.
                  </p>
                </details>
                <div className="button-row">
                  <Button
                    disabled={!file || !view.loaded || busy}
                    onClick={() =>
                      attempt(() =>
                        engine.test(file!, settings, segments, mode),
                      )
                    }
                  >
                    <Play size={17} /> Start test
                  </Button>
                  {view.status === 'testing' && (
                    <Button kind="secondary" onClick={() => engine.cancel()}>
                      <Square size={15} /> Annuleren en wissen
                    </Button>
                  )}
                  <span className="subtle" role="status">
                    {view.status === 'testing'
                      ? view.processing
                        ? 'Model verwerkt fragment…'
                        : 'Audio aanvoeren…'
                      : view.loaded
                        ? `${modelById(engine.modelId).name} geladen`
                        : 'Nog geen model geladen'}
                  </span>
                </div>
              </section>
              {view.result && (
                <section className="panel">
                  <div className="section-heading">
                    <h3>Laatste modelantwoord</h3>
                    <span className="badge">Alleen tijdelijk zichtbaar</span>
                  </div>
                  <pre className="model-output">{view.result}</pre>
                  <p className="subtle">
                    {view.facts} notitievoorstellen in deze run. Vergelijk ze
                    met de gesproken feiten; een geslaagde aanroep bewijst nog
                    geen inhoudelijke kwaliteit.
                  </p>
                  {view.canVerify && !view.verified && (
                    <Button onClick={() => engine.verify()}>
                      <Check size={17} /> Ik heb de notities gecontroleerd —
                      gebruik deze configuratie
                    </Button>
                  )}
                  {view.verified && (
                    <div className="success">
                      <Check size={18} /> Configuratie bevestigd voor deze
                      geladen modelsessie.
                    </div>
                  )}
                </section>
              )}
              {view.lastRun && (
                <section className="panel">
                  <h3>Beoordeel deze proef</h3>
                  <label>
                    Referentieverslag (optioneel, lokaal bewaard)
                    <textarea
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      rows={3}
                      placeholder="Welke feiten moesten zeker in de notities staan?"
                    />
                  </label>
                  <div className="button-row">
                    <label>
                      Menselijke kwaliteitsscore
                      <select
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                      >
                        <option value="">Kies een score</option>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n}/5
                          </option>
                        ))}
                      </select>
                    </label>
                    <Button
                      kind="secondary"
                      onClick={() =>
                        act({
                          type: 'run',
                          run: {
                            ...view.lastRun!,
                            reference: reference.slice(0, 10000),
                            score: score ? Number(score) : undefined,
                          },
                        })
                      }
                    >
                      Beoordeling bewaren
                    </Button>
                  </div>
                </section>
              )}
              <div className="section-heading history-heading">
                <h2>Proeven vergelijken</h2>
                <Button
                  kind="ghost"
                  disabled={!state.runs.length}
                  onClick={() =>
                    download(
                      'modelvergelijking.json',
                      JSON.stringify(
                        {
                          schema: 1,
                          runtime: RUNTIME_VERSION,
                          runs: state.runs.map((run) => ({
                            ...run,
                            reference: undefined,
                          })),
                        },
                        null,
                        2,
                      ),
                      'application/json',
                    )
                  }
                >
                  <Download size={16} /> Meetgegevens exporteren
                </Button>
              </div>
              {state.runs.length ? (
                state.runs.map((run, i) => (
                  <RunCard run={run} key={`${run.id}:${i}`} />
                ))
              ) : (
                <section className="panel">
                  <Empty icon={FlaskConical} title="Nog geen meetresultaten">
                    <p>
                      Een proef legt de exacte configuratie, bronhash en gemeten
                      verwerkingstijd vast. Test modellen na elkaar op hetzelfde
                      toestel.
                    </p>
                  </Empty>
                </section>
              )}
            </>
          )}
          {page === 'campaigns' && (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">NAMEN DIE BLIJVEN HANGEN</div>
                  <h1>
                    Jullie eigen wereld<span>.</span>
                  </h1>
                  <p>
                    Geef ieder avontuur een thuis en houd bijzondere namen bij.
                  </p>
                </div>
                <Button
                  disabled={busy || !store.ready}
                  onClick={() => {
                    setNewCampaign('');
                    setModal('campaign');
                  }}
                >
                  <Plus size={17} /> Nieuwe campagne
                </Button>
              </div>
              {!campaign ? (
                <section className="panel">
                  <Empty icon={Users} title="Een wereld wacht op jullie">
                    <p>
                      Maak een campagne aan om sessies en een eigen woordenboek
                      te verzamelen.
                    </p>
                  </Empty>
                </section>
              ) : (
                <>
                  <section className="panel">
                    <div className="settings-grid">
                      <label>
                        Campagne
                        <select
                          value={campaign.id}
                          disabled={busy}
                          onChange={(e) => setCampaignId(e.target.value)}
                        >
                          {state.campaigns.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="campaign-count">
                        <strong>
                          {
                            state.sessions.filter(
                              (s) => s.campaignId === campaign.id,
                            ).length
                          }
                        </strong>
                        <span>sessies in dit avontuur</span>
                      </div>
                    </div>
                    <h3>Campagnewoordenboek</h3>
                    <p className="subtle">
                      Bevestig de schrijfwijze van NPC's, plaatsen en
                      voorwerpen. Relevante namen gaan mee als context;
                      bestaande notities worden nooit automatisch vervangen.
                    </p>
                    <form
                      className="inline-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (newWord.trim()) {
                          act({
                            type: 'glossary',
                            campaignId: campaign.id,
                            words: [...campaign.glossary, newWord.trim()],
                          });
                          setNewWord('');
                        }
                      }}
                    >
                      <input
                        aria-label="Nieuw campagnebegrip"
                        value={newWord}
                        maxLength={100}
                        onChange={(e) => setNewWord(e.target.value)}
                        placeholder="Bijvoorbeeld een NPC of plaatsnaam"
                      />
                      <Button type="submit" disabled={!newWord.trim()}>
                        <Plus size={16} /> Toevoegen
                      </Button>
                    </form>
                    <div className="chips">
                      {campaign.glossary.map((word) => (
                        <span className="chip" key={word}>
                          {word}
                          <button
                            aria-label={`${word} verwijderen`}
                            onClick={() =>
                              act({
                                type: 'glossary',
                                campaignId: campaign.id,
                                words: campaign.glossary.filter(
                                  (w) => w !== word,
                                ),
                              })
                            }
                          >
                            <X size={13} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </section>
                  <section className="panel">
                    <h3>Namen uit eerdere verhalen</h3>
                    <p className="subtle">
                      Plak een oud sessieverslag. Deze eenvoudige
                      hoofdletteranalyse stelt kandidaten voor; jij beslist wat
                      een naam is.
                    </p>
                    <label>
                      Vorig sessieverslag
                      <textarea
                        rows={5}
                        value={sourceText}
                        maxLength={100000}
                        onChange={(e) => setSourceText(e.target.value)}
                        placeholder="Plak hier je eigen verslag…"
                      />
                    </label>
                    {sourceText && (
                      <div className="candidate-list">
                        {glossaryCandidates(sourceText)
                          .filter((c) => !campaign.glossary.includes(c.word))
                          .map((c) => (
                            <div key={c.word}>
                              <div>
                                <strong>
                                  {c.word}{' '}
                                  <span className="subtle">· {c.count}×</span>
                                </strong>
                                <p>{c.example}</p>
                              </div>
                              <Button
                                kind="secondary"
                                onClick={() =>
                                  act({
                                    type: 'glossary',
                                    campaignId: campaign.id,
                                    words: [...campaign.glossary, c.word],
                                  })
                                }
                              >
                                <Plus size={15} /> Bevestigen
                              </Button>
                            </div>
                          ))}
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          )}
        </main>
        <footer className="page-footer">
          <span>DnD Notulist</span>
          <span role="status">
            {store.error
              ? 'Opslaan mislukt'
              : store.pending
                ? 'Wijzigingen opslaan…'
                : store.ready
                  ? 'Alles lokaal opgeslagen'
                  : 'Lokale opslag openen…'}
          </span>
          <span>Gemaakt voor verhalen die het onthouden waard zijn.</span>
          <span>✦</span>
        </footer>
      </div>
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="modal panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-heading">
              <h2 id="modal-title">
                {modal === 'session'
                  ? 'Een nieuw avontuur'
                  : 'Een nieuwe campagne'}
              </h2>
              <button
                className="icon-button"
                aria-label="Dialoog sluiten"
                onClick={() => setModal(null)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={create}>
              {(modal === 'campaign' || !state.campaigns.length) && (
                <label>
                  Naam van de campagne
                  <input
                    autoFocus
                    required
                    maxLength={100}
                    value={newCampaign}
                    onChange={(e) => setNewCampaign(e.target.value)}
                    placeholder="Hoe heet jullie wereld of campagne?"
                  />
                </label>
              )}
              {modal === 'session' && (
                <>
                  {state.campaigns.length > 0 && (
                    <label>
                      Campagne
                      <select
                        value={campaign?.id}
                        onChange={(e) => setCampaignId(e.target.value)}
                      >
                        {state.campaigns.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  <label>
                    Naam van de sessie
                    <input
                      autoFocus={!!state.campaigns.length}
                      required
                      maxLength={120}
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Geef dit hoofdstuk een naam"
                    />
                  </label>
                </>
              )}
              <p className="footnote">
                <ShieldCheck size={14} /> Alleen opgeslagen in deze browser.
              </p>
              <Button type="submit">
                <Plus size={17} />{' '}
                {modal === 'session' ? 'Sessie aanmaken' : 'Campagne aanmaken'}
              </Button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
