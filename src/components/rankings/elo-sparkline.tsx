type EloSparklineProps = {
  points: Array<{ ratingDisplay: number }>;
};

export function EloSparkline({ points }: EloSparklineProps) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-zinc-500">Pas encore assez de matchs pour afficher une courbe.</p>
    );
  }

  const values = points.map((pPoint) => pPoint.ratingDisplay);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const width = 320;
  const height = 96;
  const padding = 8;

  const path = values
    .map((pValue, pIndex) => {
      const x = padding + (pIndex / (values.length - 1)) * (width - padding * 2);
      const y = height - padding - ((pValue - min) / span) * (height - padding * 2);
      return `${pIndex === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-24 w-full max-w-md text-zinc-900"
      role="img"
      aria-label="Courbe d’évolution de l’Elo"
    >
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
