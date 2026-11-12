// Covers: T4, T5. An agent cannot run the client functions with `callRendererFunction`.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MessageProcessor } from '@a2ui/web_core/v1_0';
import { buildKalturaCatalog } from '../../src/adapters/react/index';

let open: ReturnType<typeof vi.fn>;
let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  open = vi.fn();
  writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal('open', open);
  vi.stubGlobal('navigator', { clipboard: { writeText } });
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The responses the renderer produces for the agent's call. */
async function agentCalls(call: string, args: Record<string, unknown>) {
  const catalog = buildKalturaCatalog();
  const processor = new MessageProcessor([catalog] as never);
  processor.processMessages([{ version: '1.0', createSurface: { surfaceId: 's', catalogId: catalog.id } }] as never);
  const message = { version: '1.0', callRendererFunction: { surfaceId: 's', functionCallId: 'c1', callFunction: { '@call': call, catalogId: catalog.id, args } } };
  return processor.processMessagesAsync([message] as never);
}

describe('T4, T5: agent calls to client functions', () => {
  it('T4: openUrl from the agent gets an error response and does not open a window', async () => {
    const responses = await agentCalls('openUrl', { url: 'https://example.com' });
    expect([open.mock.calls.length, JSON.stringify(responses)]).toEqual([0, expect.stringMatching(/error/i)]);
  });

  it('T4: copyToClipboard from the agent does not write to the clipboard', async () => {
    const responses = await agentCalls('copyToClipboard', { text: 'from the agent' });
    expect([writeText.mock.calls.length, JSON.stringify(responses)]).toEqual([0, expect.stringMatching(/error/i)]);
  });

  it('T5: an unknown function gets an error response, not a silent drop', async () => {
    const responses = await agentCalls('doesNotExist', {});
    expect(JSON.stringify(responses)).toMatch(/c1.*error|error.*c1/);
  });
});
