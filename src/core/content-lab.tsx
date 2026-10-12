import { UnisphereWidgetCore } from './unisphere-widget';
import { KalturaContentLabApi } from '../schemas/content-lab';
import { withValidatedProps } from './validate-props';
import { withKs } from './ks';

export interface ContentLabCoreProps {
  partnerId: number;
  ks: string;
  serverUrl: string;
  entryId?: string;
}

function ContentLabView(props: ContentLabCoreProps) {
  return (
    <UnisphereWidgetCore
      partnerId={props.partnerId}
      ks={props.ks}
      serverUrl={props.serverUrl}
      widgetName="unisphere.widget.content-lab"
      runtimeName="kaltura-content-lab"
      runtimeSettings={{
        ...(props.entryId ? { entryId: props.entryId } : {}),
      }}
      label="Kaltura Content Lab"
    />
  );
}

export const ContentLabCore = withKs('content-lab', withValidatedProps(KalturaContentLabApi.schema.required({ ks: true }), 'Kaltura Content Lab', ContentLabView));
