export interface GenieCoreProps {
    partnerId: number;
    ks: string;
    serverUrl: string;
    categoryId?: string;
    language?: string;
}
export declare const GenieCore: import("react").FC<Omit<GenieCoreProps, "ks"> & {
    ks?: string;
}>;
//# sourceMappingURL=genie.d.ts.map