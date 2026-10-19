// What the Kaltura guides say, next to what our code does.
// The Player and the Captions editor have no URL row: they build no URL any more (ADR 0008).
// Their guide iframe embeds are listed in DOCUMENTED_DIFFERENCES as `integration`.
// Read on 2026-10-12. Guide URLs:
//   Player        https://kaltura.md/KALTURA_PLAYER_EMBED_GUIDE/
//   Captions      https://kaltura.md/KALTURA_CAPTIONS_EDITOR_API/
//   Analytics     https://kaltura.md/KALTURA_ANALYTICS_EMBED_API/
//   Recorder      https://kaltura.md/KALTURA_EXPRESS_RECORDER_API/
//   Unisphere     https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/
//   Session (KS)  https://kaltura.md/KALTURA_SESSION_GUIDE/
// The Unisphere widget and runtime names match the manifest at
// https://unisphere.nvp1.ovp.kaltura.com/v1/runtime.json.
//
// `guide` is what the guide says. `ours` is what the code does. A row that
// differs is listed in DOCUMENTED_DIFFERENCES with the reason. The test checks
// both sides. When the code starts to match the guide, remove the entry.

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
    guideRuntimes: ['application', 'chat', 'avatar', 'flashcards-tool', 'followups-tool', 'sources-tool'],
    oursWidget: 'unisphere.widget.genie',
    oursRuntime: 'application',
  },
  {
    component: 'KalturaMediaManager',
    guide: 'https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/ (Available widgets)',
    guideWidget: 'unisphere.widget.media-manager',
    guideRuntimes: ['kaltura-items-media-manager'],
    oursWidget: 'unisphere.widget.media-manager',
    oursRuntime: 'kaltura-media-manager',
  },
  {
    component: 'KalturaContentLab',
    guide: 'https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/ (Available widgets)',
    guideWidget: 'unisphere.widget.content-lab',
    guideRuntimes: ['application', 'ai-consent'],
    oursWidget: 'unisphere.widget.content-lab',
    oursRuntime: 'application',
  },
  {
    component: 'KalturaAgentsWidget',
    guide: 'https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/ (Available widgets)',
    guideWidget: 'unisphere.widget.agents',
    guideRuntimes: ['manager'],
    oursWidget: 'unisphere.widget.agents',
    oursRuntime: 'manager',
  },
  {
    component: 'KalturaVodAvatar',
    guide: 'https://kaltura.md/KALTURA_UNISPHERE_FRAMEWORK_API/ (Available widgets)',
    guideWidget: 'unisphere.widget.vod-avatars',
    guideRuntimes: ['studio'],
    oursWidget: 'unisphere.widget.vod-avatars',
    oursRuntime: 'studio',
  },
];

/** The Unisphere loader the guide documents for the US region. */
export const GUIDE_LOADER_URL = 'https://unisphere.nvp1.ovp.kaltura.com/v1/loader/index.esm.js';

/** Where the code and the guide differ on purpose. Each key is `<component>:<aspect>`. */
export const DOCUMENTED_DIFFERENCES: Record<string, string> = {
  'KalturaPlayer:integration': 'The guide shows an iframe embed with the KS in the URL. We load the embedPlaykitJs script and pass the KS in the player config with useHeaderForKs. See docs/adr/0008.',
  'KalturaCaptionsEditor:integration': 'The guide shows an iframe with pid, ks and entryid in the URL. We load embed.php into a blob URL iframe and set data-* attributes. See docs/adr/0008.',
  'KalturaMediaManager:runtime': 'The code passes runtimeName kaltura-media-manager, the runtime that takes `context` and `rowActions` and reports row selection. The guide lists kaltura-items-media-manager.',
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
