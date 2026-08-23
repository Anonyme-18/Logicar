export function Gauge({
  value,
  color = "var(--primary)",
  showLabels = false,
  min,
  max,
}: {
  value: number;
  color?: string;
  showLabels?: boolean;
  min?: string;
  max?: string;
}) {
  const TICKS = 40;
  const activeCount = Math.round((value / 100) * TICKS);
  const cx = 100;
  const cy = 100;
  const r = 80;

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 260 }}>
      <svg viewBox="0 0 200 120" className="w-full">
        {Array.from({ length: TICKS }).map((_, i) => {
          const angle = Math.PI + (i / (TICKS - 1)) * Math.PI;
          const x1 = cx + (r - 10) * Math.cos(angle);
          const y1 = cy + (r - 10) * Math.sin(angle);
          const x2 = cx + r * Math.cos(angle);
          const y2 = cy + r * Math.sin(angle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={i < activeCount ? color : "var(--border)"}
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          );
        })}
        <text
          x={100}
          y={105}
          textAnchor="middle"
          fontSize={22}
          fontWeight={600}
          fill="var(--foreground)"
        >
          {value}%
        </text>
      </svg>
      {showLabels ? (
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      ) : null}
    </div>
  );
}
