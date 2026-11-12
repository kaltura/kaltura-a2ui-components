// The scripted "agent" of the demo. It plays the messages of one examples/a2ui file
// into a MessageProcessor, answers button events with the file's `replies`, and
// records everything that crosses the wire in both directions.
import { kalturaReactCatalog, setErrorHandler, toClientError } from '@kaltura/a2ui-react';
import { MessageProcessor, type AgentToRendererMessage } from '@a2ui/web_core/v1_0';
import type { ReactCatalogComponent } from '@a2ui/react';

export interface Example {
  name: string;
  description: string;
  exercises: string[];
  live?: boolean;
  messages: AgentToRendererMessage[];
  replies?: Record<string, AgentToRendererMessage[]>;
}

/** `down` is agent to renderer. `up` is renderer to agent. */
export interface WireEntry {
  id: number;
  dir: 'down' | 'up';
  kind: string;
  payload: unknown;
}

export interface Session {
  processor: MessageProcessor<ReactCatalogComponent>;
  stop: () => void;
}

const STREAM_DELAY_MS = 450;
const REPLY_DELAY_MS = 600;

const kindOf = (message: unknown) => Object.keys(message as object).find(key => key !== 'version') ?? 'message';

/**
 * Starts one run. `onWire` gets every message. `onChange` fires after each applied
 * message, so the UI can re-read the data model.
 */
export function startSession(example: Example, options: { stream: boolean; onWire: (entry: WireEntry) => void; onChange: () => void }): Session {
  let counter = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const log = (dir: WireEntry['dir'], payload: unknown) => options.onWire({ id: (counter += 1), dir, kind: kindOf(payload), payload });

  const play = (messages: AgentToRendererMessage[], delay: number) => {
    messages.forEach((message, index) => {
      const run = () => {
        log('down', message);
        // Schema errors go back to the agent, so it can fix them.
        for (const error of processor.processMessagesWithErrors([message])) log('up', error);
        options.onChange();
      };
      if (delay === 0) run();
      else timers.add(setTimeout(run, delay * (index + 1)));
    });
  };

  const processor = new MessageProcessor<ReactCatalogComponent>([kalturaReactCatalog], action => {
    log('up', { version: '1.0', action });
    const reply = example.replies?.[(action as { name?: string }).name ?? ''];
    if (reply) timers.add(setTimeout(() => play(reply, options.stream ? STREAM_DELAY_MS : 0), REPLY_DELAY_MS));
  });

  // Widget errors go to the agent as A2UI client error messages: no error text, no KS.
  setErrorHandler(error => log('up', toClientError(error)));
  log('up', { a2uiRendererCapabilities: processor.getRendererCapabilities({ versions: ['1.0'] }) });
  play(example.messages, options.stream ? STREAM_DELAY_MS : 0);

  return {
    processor,
    stop: () => {
      timers.forEach(clearTimeout);
      setErrorHandler(undefined);
    },
  };
}

/** Swaps the placeholder ids in an example for the visitor's own. */
export function withIds(example: Example, ids: { partnerId?: number; uiconfId?: number; entryId?: string }): Example {
  let json = JSON.stringify(example);
  if (ids.partnerId) json = json.replaceAll('"partnerId":1234567', `"partnerId":${ids.partnerId}`);
  if (ids.uiconfId) json = json.replaceAll('"uiconfId":7654321', `"uiconfId":${ids.uiconfId}`);
  if (ids.entryId) json = json.replaceAll('"entryId":"0_abc12345"', `"entryId":${JSON.stringify(ids.entryId)}`);
  return JSON.parse(json) as Example;
}
