import { useState, useEffect } from 'react';
import { buildChartTheme } from '@visx/xychart';

export const CHART_COLORS = [
  '#006EFA', '#00C9A7', '#FF6B6B', '#845EC2',
  '#FFC75F', '#D65DB1', '#0089BA', '#FF9671',
  '#4B4453', '#2C73D2', '#008E9B', '#C34A36',
];

export const kalturaLightTheme = buildChartTheme({
  backgroundColor: '#ffffff',
  colors: CHART_COLORS,
  gridColor: '#e8e8e8',
  gridColorDark: '#d0d0d0',
  tickLength: 4,
  svgLabelSmall: { fill: '#555555', fontSize: 11, fontFamily: 'Lato, sans-serif' },
  svgLabelBig: { fill: '#333333', fontSize: 13, fontFamily: 'Lato, sans-serif' },
});

export const kalturaDarkTheme = buildChartTheme({
  backgroundColor: '#1c2128',
  colors: CHART_COLORS,
  gridColor: '#3a3a5c',
  gridColorDark: '#2a2a4c',
  tickLength: 4,
  svgLabelSmall: { fill: '#c8d1db', fontSize: 11, fontFamily: 'Lato, sans-serif' },
  svgLabelBig: { fill: '#f0f4f8', fontSize: 13, fontFamily: 'Lato, sans-serif' },
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
  surface: '#ffffff',
  surfaceElevated: '#f0f4f8',
  border: 'rgba(15, 26, 42, 0.1)',
  text: '#0f1a2a',
  textSecondary: '#374b60',
  textMuted: '#566b80',
  emptyFill: '#edf2f7',
  stroke: '#ffffff',
  hoverFill: '#e4ecf4',
};

const darkColors: ThemeColors = {
  isDark: true,
  surface: '#1c2128',
  surfaceElevated: '#242c38',
  border: 'rgba(139, 163, 189, 0.14)',
  text: '#f0f4f8',
  textSecondary: '#c8d1db',
  textMuted: '#8b9bb0',
  emptyFill: '#242c38',
  stroke: '#2d3845',
  hoverFill: '#2d3845',
};

function useIsDark() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === 'dark'
  );

  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(el.getAttribute('data-theme') === 'dark');
    });
    observer.observe(el, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
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
