// React adapter entry — the ONLY A2UI integration path for this package.
//
// WU-0 scaffold stub. WU-2 (adapter assembly) replaces the body to:
//   - import each schemas/* API + core/* renderer,
//   - build ReactComponentImplementation[] via createComponentImplementation,
//   - export `kalturaReactCatalog`, `kalturaClientFunctions`, `loadKalturaCatalog`.
//
// Host apps register the exported catalog via
//   new MessageProcessor([kalturaReactCatalog, basicCatalog])
// — NOT as a prop on A2uiSurface (verified against installed SDK source).

import '../../styles/components.css';

export const KALTURA_CATALOG_ID = 'https://kaltura.github.io/a2ui/v1/catalog.json';

export {};
