import { Component, type ReactNode } from 'react';

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
