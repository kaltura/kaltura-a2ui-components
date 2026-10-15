// A full round trip with a stub agent: capabilities out, A2UI messages in,
// errors and actions back. Run it: npm run example:react
// In your own app, import from '@kaltura/a2ui-react' (install the tag from the latest Release).
// Import it before @a2ui/react, so the same code also imports in Node (docs/host-integration.md#server-imports-ssr).
import {
  KALTURA_CATALOG_ID,
  kalturaReactCatalog,
  setAllowedPartners,
  setAllowedUiconfs,
  setErrorHandler,
  setKsProvider,
  toClientError,
} from '@kaltura/a2ui-react';
import { StrictMode, useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { MessageProcessor, type A2uiMessage } from '@a2ui/web_core/v0_9';

// The host mints the Kaltura Session. Messages from the agent never carry it.
setKsProvider(() => undefined); // replace with your KS call

// List the ids you own. Components refuse any other id before they load code.
// The agent picks ids, so the Player for partner 1 below is refused.
setAllowedPartners([1234567]);
setAllowedUiconfs([7654321]);

// Normally these messages arrive from your agent. The catalog id must match.
const messages: A2uiMessage[] = [
  { version: 'v0.9', createSurface: { surfaceId: 'demo', catalogId: KALTURA_CATALOG_ID } },
  { version: 'v0.9', updateDataModel: { surfaceId: 'demo', path: '/', value: { title: 'Visits per day' } } },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'demo',
      components: [
        { id: 'root', component: 'Column', children: ['chart', 'cards', 'player'] },
        {
          id: 'chart',
          component: 'KalturaChart',
          chartType: 'bar',
          title: { path: '/title' },
          data: [
            { day: 'Mon', visits: 12 },
            { day: 'Tue', visits: 31 },
          ],
          xKey: 'day',
          yKeys: ['visits'],
        },
        {
          id: 'cards',
          component: 'KalturaFlashcards',
          title: 'Cells',
          cards: [{ title: 'Cell', content: 'The basic unit of life.' }],
        },
        // Partner 1 is not on the allowlist, so this fails on purpose. The
        // action sends the failure to the agent as "playerFeedback".
        {
          id: 'player',
          component: 'KalturaPlayer',
          partnerId: 1,
          uiconfId: 7654321,
          entryId: '0_abc12345',
          action: { event: { name: 'playerFeedback' } },
        },
      ],
    },
  },
];

// A stand-in for your agent. send() is what you would POST to it.
let received: string[] = [];
const subscribers = new Set<() => void>();
const agent = {
  send(message: unknown) {
    console.log('agent received', message);
    received = [...received, JSON.stringify(message)];
    subscribers.forEach((notify) => notify());
  },
  // A real agent answers with A2UI messages that use a catalog the client offered.
  reply: (): A2uiMessage[] => messages,
};

// Actions (Button clicks, the "action" of Kaltura components) go to the agent.
const processor = new MessageProcessor([kalturaReactCatalog], (action) => agent.send({ version: 'v0.9', action }));

// Widget errors go to the agent as A2UI client error messages. No error text, no KS.
setErrorHandler((error) => agent.send(toClientError(error)));

// Tell the agent which catalogs you render, then use its answer.
agent.send({ a2uiClientCapabilities: processor.getRendererCapabilities({ versions: ['v0.9'] }) });
try {
  processor.processMessages(agent.reply());
} catch (error) {
  // Schema errors in the agent's messages go back, so it can fix them.
  agent.send({
    version: 'v0.9',
    error: { code: 'VALIDATION_FAILED', surfaceId: 'demo', path: '/', message: error instanceof Error ? error.message : String(error) },
  });
}

function AgentLog() {
  const lines = useSyncExternalStore(
    (notify) => (subscribers.add(notify), () => void subscribers.delete(notify)),
    () => received,
  );
  return (
    <>
      <h2>Agent log</h2>
      <ol id="agent-log">
        {lines.map((line, index) => (
          <li key={index}>
            <code>{line}</code>
          </li>
        ))}
      </ol>
    </>
  );
}

const surface = processor.model.getSurface('demo');
if (!surface) throw new Error('surface demo was not created');

createRoot(document.getElementById('root')!).render(
  // StrictMode runs effects twice in development, so each error shows up twice here.
  <StrictMode>
    {/* The processor is typed for any catalog. This one is React only, so the surface type is safe. */}
    <A2uiSurface surface={surface as Parameters<typeof A2uiSurface>[0]['surface']} />
    <AgentLog />
  </StrictMode>,
);
