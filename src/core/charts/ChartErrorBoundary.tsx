import { Component, type ReactNode } from 'react';
import { reportError } from '../host-hooks';

interface Props {
  /** When this value changes after an error, the boundary tries to render again. */
  resetKey?: unknown;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  // The thrown error may hold data values: report fixed text only.
  componentDidCatch() {
    reportError('render-failed', 'chart', 'Unable to render chart.');
  }

  componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="chart-loading" role="alert">
          Unable to render chart.
        </div>
      );
    }
    return this.props.children;
  }
}
