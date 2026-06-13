// Web-component adapter entry — SECONDARY path, for plain-HTML / non-A2UI hosts.
// Never the A2UI consumption path (that is adapters/react).
//
// WU-0 scaffold stub. WU-2 replaces the body to define `kaltura-player`,
// `kaltura-flashcards`, `kaltura-media-manager` custom elements over each
// core/* renderer, configured via a `.config` property.

import '../../styles/components.css';

export const KALTURA_WC_TAGS = [
  'kaltura-player',
  'kaltura-flashcards',
  'kaltura-media-manager',
] as const;

export {};
