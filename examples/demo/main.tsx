// The live demo: pick an example, watch the messages arrive, click, and see what the
// agent would receive. Uses only the public API. Run it: npm run demo
// In your own app, import from '@kaltura/a2ui-react' (install the tag from the latest Release).
import { setAllowedPartners, setAllowedUiconfs, setKsProvider } from '@kaltura/a2ui-react';
import { renderMarkdown } from '@a2ui/markdown-it';
import { A2uiSurface, MarkdownContext } from '@a2ui/react';
import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { startSession, withIds, type Example, type Session, type WireEntry } from './session';
import './demo.css';

const FILES = import.meta.glob<Example>('../a2ui/*.json', { eager: true, import: 'default' });
const EXAMPLES = Object.entries(FILES)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, example]) => ({ slug: path.split('/').pop()!.replace('.json', ''), example }));

// The placeholder ids in the example files. The demo allows exactly these until you add your own.
const DEFAULT_IDS = { partnerId: 1234567, uiconfId: 7654321 };

type Theme = 'auto' | 'light' | 'dark';
type Tab = 'wire' | 'data' | 'about';
interface Live {
  partnerId?: number;
  uiconfId?: number;
  entryId?: string;
  ks?: string;
}

const surfaceIdOf = (example: Example) => (example.messages[0] as { createSurface?: { surfaceId: string } }).createSurface?.surfaceId ?? '';
const pretty = (value: unknown) => JSON.stringify(value, null, 2);

function useHashSlug() {
  const read = () => decodeURIComponent(location.hash.slice(1));
  const [slug, setSlug] = useState(read);
  useEffect(() => {
    const onHash = () => setSlug(read());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return slug;
}

function App() {
  const slug = useHashSlug();
  const current = EXAMPLES.find(item => item.slug === slug) ?? EXAMPLES[0];
  const [theme, setTheme] = useState<Theme>('auto');
  const [stream, setStream] = useState(true);
  const [tab, setTab] = useState<Tab>('wire');
  const [live, setLive] = useState<Live>({});
  const [run, setRun] = useState(0);
  const [wire, setWire] = useState<WireEntry[]>([]);
  const [session, setSession] = useState<Session>();
  const [, bump] = useState(0);
  const ksRef = useRef<string | undefined>(undefined);

  ksRef.current = live.ks;
  useEffect(() => {
    // The host mints the Kaltura Session. Messages from the agent never carry it.
    setKsProvider(() => ksRef.current);
  }, []);
  useEffect(() => {
    // The agent picks ids, so list the ones you own. Components refuse any other id before they load code.
    setAllowedPartners([live.partnerId ?? DEFAULT_IDS.partnerId]);
    setAllowedUiconfs([live.uiconfId ?? DEFAULT_IDS.uiconfId]);
  }, [live.partnerId, live.uiconfId]);
  useEffect(() => {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  const example = useMemo(() => withIds(current.example, live), [current, live]);
  useEffect(() => {
    setWire([]);
    const next = startSession(example, {
      stream,
      onWire: entry => setWire(previous => [...previous, entry]),
      onChange: () => bump(count => count + 1),
    });
    setSession(next);
    return next.stop;
  }, [example, stream, run]);

  const surface = session?.processor.getSurface(surfaceIdOf(example));
  const dataModel = surface?.dataModel.get('/');
  const select = useCallback((slugValue: string) => {
    location.hash = slugValue;
  }, []);

  return (
    <>
      <a className="skip" href="#main">Skip to the example</a>
      <header className="bar">
        <h1>Kaltura A2UI components</h1>
        <p className="tag">A2UI 1.0 · live demo</p>
        <label>
          Theme{' '}
          <select value={theme} onChange={event => setTheme(event.target.value as Theme)}>
            <option value="auto">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={stream} onChange={event => setStream(event.target.checked)} /> Stream messages
        </label>
        <button type="button" onClick={() => setRun(count => count + 1)}>Replay</button>
      </header>

      <div className="layout">
        <nav aria-label="Examples">
          <ul>
            {EXAMPLES.map(item => (
              <li key={item.slug}>
                <button type="button" aria-current={item.slug === current.slug ? 'page' : undefined} onClick={() => select(item.slug)}>
                  {item.example.name}
                  {item.example.live ? <small> · needs your ids</small> : null}
                </button>
              </li>
            ))}
          </ul>
          <LivePanel live={live} onApply={setLive} />
        </nav>

        <main id="main">
          <h2>{example.name}</h2>
          <p>{example.description}</p>
          <p className="chips" aria-label="Exercises">
            {example.exercises.map(name => (
              <span key={name}>{name}</span>
            ))}
          </p>
          <div className="stage" data-testid="stage">
            {/* The processor is typed for any catalog. This one is React only, so the surface type is safe. */}
            {surface ? (
              // Text renders markdown with the renderer you give it. The Kaltura catalog sanitises the result.
              <MarkdownContext.Provider value={renderMarkdown}>
                <A2uiSurface surface={surface as Parameters<typeof A2uiSurface>[0]['surface']} />
              </MarkdownContext.Provider>
            ) : (
              <p className="wait">Waiting for the first message…</p>
            )}
          </div>
        </main>

        <aside aria-label="Inspector">
          <div role="tablist" aria-label="Inspector views">
            {(['wire', 'data', 'about'] as const).map(id => (
              <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} onClick={() => setTab(id)}>
                {{ wire: `Wire (${wire.length})`, data: 'Data model', about: 'About' }[id]}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} tabIndex={0}>
            {tab === 'wire' && <Wire entries={wire} />}
            {tab === 'data' && <pre data-testid="data-model">{dataModel === undefined ? 'The agent has not sent data yet.' : pretty(dataModel)}</pre>}
            {tab === 'about' && <About />}
          </div>
        </aside>
      </div>
    </>
  );
}

function Wire({ entries }: { entries: WireEntry[] }) {
  return (
    <ol className="wire" aria-label="Messages">
      {entries.map(entry => (
        <li key={entry.id} className={entry.dir}>
          <details>
            <summary>
              <span className="dir">{entry.dir === 'down' ? 'agent-to-renderer' : 'renderer-to-agent'}</span> <code>{entry.kind}</code>
            </summary>
            <pre>{pretty(entry.payload)}</pre>
          </details>
        </li>
      ))}
    </ol>
  );
}

function About() {
  return (
    <div className="about">
      <p>
        The page plays A2UI 1.0 messages from <code>examples/a2ui/*.json</code> into a <code>MessageProcessor</code> with <code>kalturaReactCatalog</code>. No model and no key are involved.
      </p>
      <ul>
        <li><b>agent-to-renderer</b>: what an agent sends.</li>
        <li><b>renderer-to-agent</b>: capabilities, button events and widget errors. Errors carry a fixed code, never text from Kaltura and never a session.</li>
      </ul>
      <p>
        <a href="https://github.com/kaltura/kaltura-a2ui-components#readme">README</a> · <a href="https://github.com/kaltura/kaltura-a2ui-components/blob/main/docs/host-api.md">Host API</a> · <a href="https://github.com/kaltura/kaltura-a2ui-components/blob/main/docs/agent-guide.md">Agent guide</a>
      </p>
    </div>
  );
}

function LivePanel({ live, onApply }: { live: Live; onApply: (live: Live) => void }) {
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? '').trim();
    const number = (name: string) => (/^[1-9]\d*$/.test(text(name)) ? Number(text(name)) : undefined);
    onApply({ partnerId: number('partnerId'), uiconfId: number('uiconfId'), entryId: text('entryId') || undefined, ks: text('ks') || undefined });
  };
  return (
    <details className="live">
      <summary>Use your Kaltura account</summary>
      <form onSubmit={submit}>
        <label>Partner ID <input name="partnerId" inputMode="numeric" defaultValue={live.partnerId ?? ''} /></label>
        <label>Player uiConf ID <input name="uiconfId" inputMode="numeric" defaultValue={live.uiconfId ?? ''} /></label>
        <label>Entry ID <input name="entryId" defaultValue={live.entryId ?? ''} placeholder="0_abc12345" /></label>
        <label>Kaltura Session <input name="ks" type="password" autoComplete="off" /></label>
        <button type="submit">Apply</button>
        <small>Kept in this page only. Nothing is stored. Only the Kaltura widgets use them, and only for ids you list here.</small>
      </form>
    </details>
  );
}

createRoot(document.getElementById('root')!).render(
  // StrictMode runs effects twice in development, so each run can show twice.
  <StrictMode>
    <App />
  </StrictMode>,
);
