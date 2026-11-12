import { useState, useEffect } from 'react';
import { buildChartTheme } from '@visx/xychart';
import { readColorMode } from '../color-mode';

// The host sets these tokens to restyle the chart. The old values are the fallback.
const SURFACE = (fallback: string) => `var(--a2ui-color-surface, ${fallback})`;
const ON_SURFACE = (fallback: string) => `var(--a2ui-color-on-surface, ${fallback})`;
const BORDER = (fallback: string) => `var(--a2ui-color-border, ${fallback})`;

export const CHART_COLORS = [
  '#006EFA', '#00C9A7', '#FF6B6B', '#845EC2',
  '#FFC75F', '#D65DB1', '#0089BA', '#FF9671',
  '#4B4453', '#2C73D2', '#008E9B', '#C34A36',
];

export const kalturaLightTheme = buildChartTheme({
  backgroundColor: SURFACE('#ffffff'),
  colors: CHART_COLORS,
  gridColor: '#e8e8e8',
  gridColorDark: '#d0d0d0',
  tickLength: 4,
  svgLabelSmall: { fill: ON_SURFACE('#555555'), fontSize: 11, fontFamily: 'Lato, sans-serif' },
  svgLabelBig: { fill: ON_SURFACE('#333333'), fontSize: 13, fontFamily: 'Lato, sans-serif' },
});

export const kalturaDarkTheme = buildChartTheme({
  backgroundColor: SURFACE('#1c2128'),
  colors: CHART_COLORS,
  gridColor: '#3a3a5c',
  gridColorDark: '#2a2a4c',
  tickLength: 4,
  svgLabelSmall: { fill: ON_SURFACE('#c8d1db'), fontSize: 11, fontFamily: 'Lato, sans-serif' },
  svgLabelBig: { fill: ON_SURFACE('#f0f4f8'), fontSize: 13, fontFamily: 'Lato, sans-serif' },
});

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

const lightColors: ThemeColors = {
  isDark: false,
  surface: SURFACE('#ffffff'),
  surfaceElevated: '#f0f4f8',
  border: BORDER('rgba(15, 26, 42, 0.1)'),
  text: ON_SURFACE('#0f1a2a'),
  textSecondary: '#374b60',
  textMuted: '#566b80',
  emptyFill: '#edf2f7',
  stroke: '#ffffff',
  hoverFill: '#e4ecf4',
};

const darkColors: ThemeColors = {
  isDark: true,
  surface: SURFACE('#1c2128'),
  surfaceElevated: '#242c38',
  border: BORDER('rgba(139, 163, 189, 0.14)'),
  text: ON_SURFACE('#f0f4f8'),
  textSecondary: '#c8d1db',
  textMuted: '#8b9bb0',
  emptyFill: '#242c38',
  stroke: '#2d3845',
  hoverFill: '#2d3845',
};

function useIsDark() {
  const read = () => typeof document !== 'undefined' && readColorMode('light') === 'dark';
  const [isDark, setIsDark] = useState(read);

  useEffect(() => {
    const update = () => setIsDark(read());
    const observer = new MutationObserver(update);
    const options = { attributes: true, attributeFilter: ['data-theme', 'class'] };
    observer.observe(document.documentElement, options);
    observer.observe(document.body, options);
    const query = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : undefined;
    query?.addEventListener('change', update);
    update();
    return () => {
      observer.disconnect();
      query?.removeEventListener('change', update);
    };
  }, []);

  return isDark;
}

export function useChartTheme() {
  const isDark = useIsDark();
  return isDark ? kalturaDarkTheme : kalturaLightTheme;
}

export function useThemeColors(): ThemeColors {
  const isDark = useIsDark();
  return isDark ? darkColors : lightColors;
}
