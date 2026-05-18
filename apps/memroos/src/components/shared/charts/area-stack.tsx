import { NOC, NOC_FONT_MONO } from "@/lib/noc-theme";

interface AreaSeries {
  color: string;
  values: number[];
}

interface AreaStackProps {
  series: AreaSeries[];
  labels: string[];
  w?: number;
  h?: number;
}

function AreaStack({ series, labels, w = 640, h = 200 }: AreaStackProps) {
  const n = labels.length;
  const sums = labels.map((_, i) =>
    series.reduce((acc, s) => acc + s.values[i], 0),
  );
  const max = Math.max(...sums, 1);
  const px = (i: number) => (i / (n - 1)) * (w - 40) + 32;
  const py = (v: number) => h - 28 - (v / max) * (h - 48);

  const { paths } = series.reduce<{
    cumulative: number[];
    paths: Array<{ d: string; color: string }>;
  }>(
    (acc, s) => {
      const top = s.values.map(
        (v, i) => [px(i), py(acc.cumulative[i] + v)] as const,
      );
      const bot = s.values
        .map((_, i) => [px(i), py(acc.cumulative[i])] as const)
        .reverse();
      const d = [
        ...top.map(([x, y], i) =>
          i
            ? `L${x.toFixed(1)} ${y.toFixed(1)}`
            : `M${x.toFixed(1)} ${y.toFixed(1)}`,
        ),
        ...bot.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`),
        "Z",
      ].join(" ");
      return {
        cumulative: acc.cumulative.map((c, i) => c + s.values[i]),
        paths: [...acc.paths, { d, color: s.color }],
      };
    },
    { cumulative: labels.map(() => 0), paths: [] },
  );

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width="100%"
      height={h}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      {[0, 0.25, 0.5, 0.75, 1].map((g, i) => (
        <line
          key={i}
          x1="32"
          x2={w}
          y1={py(max * g)}
          y2={py(max * g)}
          stroke={NOC.rule}
          strokeDasharray={i ? "2 4" : undefined}
        />
      ))}
      {[0, 0.5, 1].map((g, i) => (
        <text
          key={i}
          x="0"
          y={py(max * g) + 4}
          fontSize="9.5"
          fontFamily={NOC_FONT_MONO}
          fill={NOC.soft}
        >
          {Math.round(max * g)}
        </text>
      ))}
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill={p.color} opacity={0.85} />
      ))}
      {labels.map(
        (l, i) =>
          i % Math.ceil(n / 8) === 0 && (
            <text
              key={i}
              x={px(i)}
              y={h - 8}
              fontSize="9.5"
              fontFamily={NOC_FONT_MONO}
              fill={NOC.soft}
              textAnchor="middle"
            >
              {l}
            </text>
          ),
      )}
    </svg>
  );
}

export { AreaStack };
export type { AreaStackProps, AreaSeries };
