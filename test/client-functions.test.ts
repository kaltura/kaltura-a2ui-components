import { describe, it, expect, vi, beforeEach } from 'vitest';
import { kalturaClientFunctions, CopyToClipboardImplementation } from '../src/catalog/client-functions';

describe('kalturaClientFunctions', () => {
  it('has exactly 1 entry', () => {
    expect(kalturaClientFunctions).toHaveLength(1);
  });

  it('the single entry is named copyToClipboard', () => {
    expect(kalturaClientFunctions[0].name).toBe('copyToClipboard');
  });
});

describe('CopyToClipboardImplementation', () => {
  beforeEach(() => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', {
      clipboard: { writeText },
    });
  });

  it('calls navigator.clipboard.writeText with the provided text', () => {
    const mockContext = {} as Parameters<typeof CopyToClipboardImplementation.execute>[1];
    CopyToClipboardImplementation.execute({ text: 'hi' }, mockContext);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('hi');
  });

  it('does not call writeText when text is empty string', () => {
    const mockContext = {} as Parameters<typeof CopyToClipboardImplementation.execute>[1];
    CopyToClipboardImplementation.execute({ text: '' }, mockContext);
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it('coerces non-string args.text to string before writing', () => {
    const mockContext = {} as Parameters<typeof CopyToClipboardImplementation.execute>[1];
    // args.text as number — schema is z.string() but execute coerces via String()
    CopyToClipboardImplementation.execute({ text: 42 } as unknown as { text: string }, mockContext);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('42');
  });
});
