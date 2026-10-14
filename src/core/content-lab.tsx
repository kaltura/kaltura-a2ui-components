import { UnisphereWidgetCore } from './unisphere-widget';
import { KalturaContentLabApi } from '../schemas/content-lab';
import { withValidatedProps } from './validate-props';
import { withKs, withKsProp } from './ks';
import { isEntryId } from './ids';
import { kalturaHosts } from './region';

export interface ContentLabCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  uiconfId: number;
  entryId: string;
}

interface ContentLabRuntime {
  partnerChecks: { onChanges: (listener: (checks: { status: string; isAvailable: boolean }) => void) => unknown };
  openApplication: (options: { entryId: string; eventSessionContextId: string; type: 'entry' }) => void;
}

/** `openApplication` does nothing until the partner checks have loaded. */
function openWhenChecked(runtime: unknown, entryId: string, isCancelled: () => boolean): void {
  const { partnerChecks, openApplication } = runtime as ContentLabRuntime;
  let opened = false;
  partnerChecks.onChanges(checks => {
    if (isCancelled() || opened || checks.status === 'loading') return;
    opened = true;
    if (checks.isAvailable && isEntryId(entryId)) openApplication.call(runtime, { entryId, eventSessionContextId: '', type: 'entry' });
  });
}

function ContentLabView(props: ContentLabCoreProps) {
  return (
    <UnisphereWidgetCore
      partnerId={props.partnerId}
      ks={props.ks}
      serverUrl={props.serverUrl}
      widgetName="unisphere.widget.content-lab"
      runtimeName="application"
      visualType="drawer"
      runtimeSettings={{
        _schemaVersion: '1',
        ks: props.ks,
        pid: String(props.partnerId),
        uiconfId: String(props.uiconfId),
        kalturaServerURI: kalturaHosts().serviceUrl,
        analyticsServerURI: 'analytics.kaltura.com',
        // 0 is KMC. With 1 (KMS) the menu hides captions unless reachConfig is set.
        hostAppName: 0,
        // Without this the runtime skips its consent check and never asks for AI consent.
        hostedInKalturaProduct: true,
        // '' lists every feature. Unset, the menu stays empty.
        widget: '',
      }}
      extraRuntimes={[
        {
          // The application runtime opens this one when the account has not given AI consent.
          runtimeName: 'ai-consent',
          visualType: 'announcement',
          settings: {
            _schemaVersion: '1',
            ks: props.ks,
            pid: String(props.partnerId),
            hostApp: 'kaltura-a2ui-components',
            // The runtime rejects an empty version, and the package has no version constant.
            kaltura: { analyticsServerURI: 'analytics.kaltura.com', hostAppName: 0, hostAppVersion: 'unknown' },
          },
        },
      ]}
      onRuntime={(runtime, isCancelled) => openWhenChecked(runtime, props.entryId, isCancelled)}
      label="Kaltura Content Lab"
      containerClass="kaltura-kaltura-content-lab-container"
      widget="content-lab"
    />
  );
}

export const ContentLabCore = withKs('content-lab', withValidatedProps(withKsProp(KalturaContentLabApi.schema), 'Kaltura Content Lab', ContentLabView, 'content-lab'));
