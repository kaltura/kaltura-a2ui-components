// What the Kaltura guides say, next to what our code does (plan item 3.3c).
// The Player and the Captions editor have no URL row: they build no URL any more (ADR 0008).
// Their guide iframe embeds are listed in KNOWN_DIVERGENCES as `integration`.
// Read on 2026-10-12. Guide URLs:
//   Player        https://kaltura.md/KALTURA_PLAYER_EMBED_GUIDE/
//   Captions      https://kaltura.md/KALTURA_CAPTIONS_EDITOR_API/
//   Analytics     https://kaltura.md/KALTURA_ANALYTICS_EMBED_API/
//   Recorder      https://kaltura.md/KALTURA_EXPRESS_RECORDER_API/
//   Unisphere     https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/
//   Session (KS)  https://kaltura.md/KALTURA_SESSION_GUIDE/
// The Unisphere widget and runtime names were also checked against the live
// manifest, https://unisphere.nvp1.ovp.kaltura.com/v1/runtime.json (GET only).
//
// `guide` is what the guide says. `ours` is what the code does today. Where they
// differ, the row is listed in KNOWN_DIVERGENCES with the finding or decision that
// owns it. The test pins both sides: a code change that fixes a divergence makes
// the test ask you to remove the entry.

export interface UrlRow {
  /** Component name in the catalog. */
  component: string;
  guide: string;
  /** Base URL (origin and path) the guide documents. */
  guideBase: string;
  /** Query parameter names the guide documents. */
  guideParams: string[];
  /** Base URL our code builds. */
  oursBase: string;
  /** Query parameter names our code sends. */
  oursParams: string[];
}

export const URL_ROWS: UrlRow[] = [
  {
    component: 'KalturaAnalytics',
    guide: 'https://kaltura.md/KALTURA_ANALYTICS_EMBED_API/ (Embedding, postMessage protocol)',
    guideBase: 'https://kmc.kaltura.com/apps/kmc-analytics/latest/index.html',
    guideParams: [],
    oursBase: 'https://kmc.kaltura.com/apps/kmc-analytics/latest/index.html',
    oursParams: [],
  },
];

export interface WidgetRow {
  component: string;
  guide: string;
  guideWidget: string;
  /** Runtimes the guide lists for the widget. */
  guideRuntimes: string[];
  oursWidget: string;
  oursRuntime: string;
}

export const WIDGET_ROWS: WidgetRow[] = [
  {
    component: 'KalturaGenie',
    guide: 'https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/ (Available widgets)',
    guideWidget: 'unisphere.widget.genie',
    guideRuntimes: ['chat', 'avatar', 'flashcards-tool', 'followups-tool', 'sources-tool'],
    oursWidget: 'unisphere.widget.genie',
    oursRuntime: 'kaltura-genie',
  },
  {
    component: 'KalturaMediaManager',
    guide: 'https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/ (Available widgets)',
    guideWidget: 'unisphere.widget.media-manager',
    guideRuntimes: ['kaltura-items-media-manager'],
    oursWidget: 'unisphere.widget.media-manager',
    oursRuntime: 'kaltura-items-media-manager',
  },
  {
    component: 'KalturaContentLab',
    guide: 'https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/ (Available widgets)',
    guideWidget: 'unisphere.widget.content-lab',
    guideRuntimes: ['application', 'ai-consent'],
    oursWidget: 'unisphere.widget.content-lab',
    oursRuntime: 'kaltura-content-lab',
  },
  {
    component: 'KalturaAgentsWidget',
    guide: 'https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/ (Available widgets)',
    guideWidget: 'unisphere.widget.agents',
    guideRuntimes: ['manager'],
    oursWidget: 'unisphere.widget.agents',
    oursRuntime: 'kaltura-agents',
  },
  {
    component: 'KalturaVodAvatar',
    guide: 'https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/ (Available widgets)',
    guideWidget: 'unisphere.widget.vod-avatars',
    guideRuntimes: ['studio'],
    oursWidget: 'unisphere.widget.vod-avatar',
    oursRuntime: 'kaltura-vod-avatar',
  },
];

/** The Unisphere loader the guide documents for the US region. */
export const GUIDE_LOADER_URL = 'https://unisphere.nvp1.ovp.kaltura.com/v1/loader/index.esm.js';

/** Where the code and the guide differ today. Each key is `<component>:<aspect>`. */
export const KNOWN_DIVERGENCES: Record<string, string> = {
  'KalturaPlayer:integration': 'The guide shows an iframe embed with the KS in the URL. We load the embedPlaykitJs script and pass the KS in the player config with useHeaderForKs. See docs/adr/0008.',
  'KalturaCaptionsEditor:integration': 'The guide shows an iframe with pid, ks and entryid in the URL. We load embed.php into a blob URL iframe and set data-* attributes. See docs/adr/0008.',
  'KalturaGenie:runtime': 'We pass runtimeName kaltura-genie. The guide and the live manifest list chat, avatar and the tools. Needs the Genie team.',
  'KalturaContentLab:runtime': 'We pass runtimeName kaltura-content-lab. The guide and the live manifest list application and ai-consent. Needs the Content Lab team.',
  'KalturaAgentsWidget:runtime': 'We pass runtimeName kaltura-agents. The guide lists manager. Needs the Agents team.',
  'KalturaVodAvatar:widget': 'We pass widgetName unisphere.widget.vod-avatar. The guide and the live manifest name it unisphere.widget.vod-avatars (plural).',
  'KalturaVodAvatar:runtime': 'We pass runtimeName kaltura-vod-avatar. The guide lists studio.',
};

/** KS privileges the guides name. Used by docs/ks-privileges.md, checked by the docs test. */
export const KS_PRIVILEGES: { component: string; ksType: 'user' | 'admin'; privileges: string[]; guide: string }[] = [
  {
    component: 'KalturaPlayer',
    ksType: 'user',
    privileges: ['setrole:PLAYBACK_BASE_ROLE', 'sview:<entryId>', 'appid', 'privacycontext', 'enableentitlement'],
    guide: 'https://kaltura.md/KALTURA_PLAYER_EMBED_GUIDE/',
  },
  { component: 'KalturaAnalytics', ksType: 'admin', privileges: [], guide: 'https://kaltura.md/KALTURA_ANALYTICS_EMBED_API/' },
  { component: 'KalturaRecorder', ksType: 'user', privileges: ['editadmintags:*'], guide: 'https://kaltura.md/KALTURA_EXPRESS_RECORDER_API/' },
  { component: 'KalturaGenie', ksType: 'user', privileges: ['setrole:PLAYBACK_BASE_ROLE'], guide: 'https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/' },
];
