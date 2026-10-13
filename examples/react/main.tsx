// A2UI messages in, Kaltura components out. Needs a build: npm run build.
// In your own app, import from '@kaltura/a2ui-react' (npm i github:kaltura/kaltura-a2ui-components#v0.2.0).
// Before @a2ui/react, so the same code also imports in Node (docs/host-integration.md#server-imports-ssr).
import { KALTURA_CATALOG_ID, kalturaReactCatalog, setErrorHandler, setKsProvider } from '@kaltura/a2ui-react';
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { A2uiSurface } from '@a2ui/react/v0_9';
import { MessageProcessor } from '@a2ui/web_core/v0_9';

// The host mints the Kaltura Session. Messages from the agent never carry it.
setKsProvider(() => undefined);
setErrorHandler((error) => console.warn('kaltura widget error:', error.code));

// Normally these messages arrive from your agent. The catalog id must match.
const messages = [
  { version: 'v0.9', createSurface: { surfaceId: 'demo', catalogId: KALTURA_CATALOG_ID } },
  { version: 'v0.9', updateDataModel: { surfaceId: 'demo', path: '/', value: { title: 'Visits per day' } } },
  {
    version: 'v0.9',
    updateComponents: {
      surfaceId: 'demo',
      components: [
        { id: 'root', component: 'Column', children: ['chart', 'cards'] },
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
      ],
    },
  },
];

const processor = new MessageProcessor([kalturaReactCatalog]);
processor.processMessages(messages as never);
const surface = processor.model.getSurface('demo');
if (!surface) throw new Error('surface demo was not created');

createRoot(document.getElementById('root')!).render(createElement(A2uiSurface, { surface }));
