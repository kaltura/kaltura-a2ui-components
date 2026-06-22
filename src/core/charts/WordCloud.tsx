import { useMemo, useRef, useState, useEffect } from 'react';
import { Text } from '@visx/text';
import { scaleLog } from '@visx/scale';
import { Wordcloud } from '@visx/wordcloud';
import { CHART_COLORS } from './theme';

interface WordCloudProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKeys: string[];
  colors?: string[];
  height: number;
}

interface WordData {
  text: string;
  value: number;
}

interface WordCloudWord {
  text?: string;
  x?: number;
  y?: number;
  rotate?: number;
  size?: number;
  font?: string;
  weight?: number | string;
}

function WordCloudInner({ data, xKey, yKeys, colors, height, width }: WordCloudProps & { width: number }) {
  const palette = colors || CHART_COLORS;
  const valueKey = yKeys[0] || 'value';

  const words: WordData[] = useMemo(() =>
    data
      .map(d => ({ text: String(d[xKey] || ''), value: Number(d[valueKey]) || 0 }))
      .filter(w => w.text && w.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 80),
    [data, xKey, valueKey],
  );

  const fontScale = useMemo(() => {
    const min = Math.max(1, Math.min(...words.map(w => w.value)));
    const max = Math.max(...words.map(w => w.value));
    return scaleLog({
      domain: [min, max === min ? min + 1 : max],
      range: [13, Math.min(52, width / 8)],
    });
  }, [words, width]);

  if (!words.length) return null;

  return (
    <Wordcloud
      words={words}
      width={width}
      height={height}
      fontSize={(d: WordData) => fontScale(d.value)}
      font="Lato, sans-serif"
      fontWeight={700}
      spiral="archimedean"
      rotate={0}
      padding={4}
    >
      {(cloudWords: WordCloudWord[]) => cloudWords.map((w: WordCloudWord, i: number) => (
        <Text
          key={w.text}
          fill={palette[i % palette.length]}
          textAnchor="middle"
          transform={`translate(${w.x}, ${w.y}) rotate(${w.rotate})`}
          fontSize={w.size}
          fontFamily={w.font}
          fontWeight={w.weight}
          style={{ cursor: 'default', transition: 'opacity 150ms ease' }}
        >
          {w.text}
        </Text>
      ))}
    </Wordcloud>
  );
}

export function WordCloudChart(props: WordCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setWidth(Math.max(entry.contentRect.width, 200));
    });
    observer.observe(containerRef.current);
    setWidth(Math.max(containerRef.current.offsetWidth, 200));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <WordCloudInner {...props} width={width} />
    </div>
  );
}
