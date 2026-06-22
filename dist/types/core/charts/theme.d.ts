export declare const CHART_COLORS: string[];
export declare const kalturaLightTheme: import("@visx/xychart").XYChartTheme;
export declare const kalturaDarkTheme: import("@visx/xychart").XYChartTheme;
export interface ThemeColors {
    isDark: boolean;
    surface: string;
    surfaceElevated: string;
    border: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    emptyFill: string;
    stroke: string;
    hoverFill: string;
}
export declare function useChartTheme(): import("@visx/xychart").XYChartTheme;
export declare function useThemeColors(): ThemeColors;
//# sourceMappingURL=theme.d.ts.map