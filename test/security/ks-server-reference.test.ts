import { describe, expect, it } from 'vitest';
import { privilegesFor, type KsPolicy } from '../../examples/ks-server/privileges';

const policy: KsPolicy = { partnerId: 7, privacyContexts: { '123': 'room' } };
const make = (widget: string, scope: Record<string, unknown>, version: unknown = 1) => ({ widget, version, scope: { partnerId: 7, region: 'nvp1', ...scope } });

describe('reference KS privileges', () => {
  it.each([
    ['player entry', make('player', { entryId: '1_abcd1234' }), 'setrole:PLAYBACK_BASE_ROLE,sview:1_abcd1234'],
    ['player playlist', make('player', { playlistId: '1_abcd1234' }), 'setrole:PLAYBACK_BASE_ROLE,sviewplaylist:1_abcd1234'],
    ['flashcards', make('flashcards', { entryIds: ['1_abcd1234', '1_wxyz9876'] }), 'setrole:PLAYBACK_BASE_ROLE,sview:1_abcd1234/1_wxyz9876'],
    ['captions editor', make('captions-editor', { entryId: '1_abcd1234' }), 'edit:1_abcd1234,sview:1_abcd1234'],
    ['genie without a category', make('genie', {}), 'setrole:PLAYBACK_BASE_ROLE,sview:*'],
    ['genie with a category', make('genie', { categoryId: '123' }), 'setrole:PLAYBACK_BASE_ROLE,sview:*,enableentitlement,privacycontext:room,geniecategoryid:123'],
  ])('maps %s', (_name, request, expected) => {
    expect(privilegesFor(request, policy)).toBe(expected);
  });

  it.each([
    ['another account', make('player', { entryId: '1_abcd1234', partnerId: 8 }), 'wrong account'],
    ['an unknown version', make('player', { entryId: '1_abcd1234' }, 2), 'unknown version'],
    ['an unknown scope key', make('player', { entryId: '1_abcd1234', role: 'admin' }), 'unknown scope key'],
    ['a privilege injected through an id', make('player', { entryId: '1_abcd1234,disableentitlement' }), 'bad entry id'],
    ['a category without a privacy context', make('genie', { categoryId: '999' }), 'no privacy context'],
    ['a category that is not digits', make('genie', { categoryId: '1,disableentitlement' }), 'bad category id'],
    ['too many flashcard entries', make('flashcards', { entryIds: Array.from({ length: 21 }, (_, i) => `1_abcd${String(1000 + i)}`) }), 'bad entry ids'],
    ['a widget without a rule', make('recorder', {}), 'no rule'],
  ])('rejects %s', (_name, request, message) => {
    expect(() => privilegesFor(request, policy)).toThrow(message);
  });

  it('never emits an unlimited privilege', () => {
    const all = [make('captions-editor', { entryId: '1_abcd1234' }), make('genie', { categoryId: '123' }), make('player', { entryId: '1_abcd1234' })].map(request => privilegesFor(request, policy));
    expect(all.join(',')).not.toMatch(/disableentitlement|edit:\*|setrole:ADMIN/);
  });
});
