import { Component, type ReactNode } from 'react';
interface Props {
    title?: string;
    children: ReactNode;
}
interface State {
    hasError: boolean;
}
export declare class ChartErrorBoundary extends Component<Props, State> {
    state: State;
    static getDerivedStateFromError(): State;
    render(): string | number | bigint | boolean | import("react").JSX.Element | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined;
}
export {};
//# sourceMappingURL=ChartErrorBoundary.d.ts.map