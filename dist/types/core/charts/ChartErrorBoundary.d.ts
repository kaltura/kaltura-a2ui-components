import { Component, type ReactNode } from 'react';
interface Props {
    /** When this value changes after an error, the boundary tries to render again. */
    resetKey?: unknown;
    children: ReactNode;
}
interface State {
    hasError: boolean;
}
export declare class ChartErrorBoundary extends Component<Props, State> {
    state: State;
    static getDerivedStateFromError(): State;
    componentDidCatch(): void;
    componentDidUpdate(prevProps: Props): void;
    render(): string | number | bigint | boolean | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | import("react").JSX.Element | null | undefined;
}
export {};
//# sourceMappingURL=ChartErrorBoundary.d.ts.map