// What the Kaltura guides say, next to what our code does (plan item 3.3c).
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
  /** Base URL (origin and path) the guide documents, with the sample ids filled in. */
  guideBase: string;
  /** Query parameter names the guide documents. */
  guideParams: string[];
  /** Base URL our code builds for the same sample ids. */
  oursBase: string;
  /** Query parameter names our code sends. */
  oursParams: string[];
}

// Sample ids used for every URL row.
export const SAMPLE = { partnerId: 1, uiconfId: 2, entryId: '0_abc', ks: 'ks-1' } as const;

export const URL_ROWS: UrlRow[] = [
  {
    component: 'KalturaPlayer',
    guide: 'https://kaltura.md/KALTURA_PLAYER_EMBED_GUIDE/ (Iframe embed)',
    guideBase: 'https://cdnapisec.kaltura.com/p/1/embedPlaykitJs/partner_id/1/uiconf_id/2',
    guideParams: ['iframeembed', 'ks', 'entry_id', 'kalturaSeekFrom', 'kalturaClipTo', 'config[playback]'],
    oursBase: 'https://cdnapisec.kaltura.com/p/1/embedPlaykitJs/partner_id/1/uiconf_id/2',
    // The guide sets autoplay and muted in config[playback]. We send the short flags below.
    oursParams: ['iframeembed', 'entry_id', 'plugins', 'ks', 'kalturaSeekFrom', 'kalturaClipTo', 'autoplay', 'mute'],
  },
  {
    component: 'KalturaCaptionsEditor',
    guide: 'https://kaltura.md/KALTURA_CAPTIONS_EDITOR_API/ (Embedding via iframe)',
    guideBase: 'https://www.kaltura.com/apps/captionstudio/latest/index.html',
    guideParams: ['pid', 'ks', 'entryid', 'assetid', 'maxcharsperline', 'cdnurl', 'serviceurl'],
    oursBase: 'https://www.kaltura.com/apps/captionstudio/latest/index.html',
    oursParams: ['pid', 'ks', 'entryid', 'cdnurl', 'serviceurl', 'uiconfid'],
  },
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
  'KalturaPlayer:params': 'We send autoplay, mute and plugins as query parameters. The guide sets playback options in config[playback]. Not decided.',
  'KalturaCaptionsEditor:params': 'We never send assetid or maxcharsperline, and we add uiconfid. The guide lists no uiconfid.',
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
