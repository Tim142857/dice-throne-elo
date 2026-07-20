import { formatDate } from "@/lib/dates";

type EloSparklinePoint = {
  at?: string;
  ratingDisplay: number;
};

type EloSparklineProps = {
  points: EloSparklinePoint[];
};

function formatChartDate(pIso: string): string {
  return formatDate(pIso);
}

export function EloSparkline({ points }: EloSparklineProps) {
  const sortedPoints = [...points].sort((pLeft, pRight) => {
    if (!pLeft.at || !pRight.at) {
      return 0;
    }
    return pLeft.at.localeCompare(pRight.at);
  });

  if (sortedPoints.length < 2) {
    return (
      <p className="text-sm text-zinc-500">Pas encore assez de matchs pour afficher une courbe.</p>
    );
  }

  const values = sortedPoints.map((pPoint) => pPoint.ratingDisplay);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const width = 640;
  const height = 160;
  const paddingLeft = 36;
  const paddingRight = 12;
  const paddingTop = 12;
  const paddingBottom = 28;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const coordinates = values.map((pValue, pIndex) => ({
    x: paddingLeft + (pIndex / (values.length - 1)) * chartWidth,
    y: paddingTop + chartHeight - ((pValue - min) / span) * chartHeight,
    value: pValue,
    at: sortedPoints[pIndex]?.at,
  }));

  const linePath = coordinates
    .map((pPoint, pIndex) => `${pIndex === 0 ? "M" : "L"} ${pPoint.x.toFixed(2)} ${pPoint.y.toFixed(2)}`)
    .join(" ");

  const areaPath = `${linePath} L ${coordinates[coordinates.length - 1]?.x.toFixed(2) ?? 0} ${(paddingTop + chartHeight).toFixed(2)} L ${coordinates[0]?.x.toFixed(2) ?? 0} ${(paddingTop + chartHeight).toFixed(2)} Z`;

  const gridLines = [0, 0.5, 1].map((pRatio) => {
    const value = Math.round(min + span * (1 - pRatio));
    const y = paddingTop + chartHeight * pRatio;
    return { value, y };
  });

  const firstPoint = sortedPoints[0];
  const lastPoint = sortedPoints[sortedPoints.length - 1];
  const firstLabel = firstPoint?.at ? formatChartDate(firstPoint.at) : "";
  const lastLabel = lastPoint?.at ? formatChartDate(lastPoint.at) : "";

  return (
    <div className="flex flex-col gap-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full text-violet-700"
        role="img"
        aria-label="Courbe d’évolution de l’Elo"
      >
        <defs>
          <linearGradient id="elo-area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(109 40 217 / 0.28)" />
            <stop offset="100%" stopColor="rgb(109 40 217 / 0.02)" />
          </linearGradient>
        </defs>

        {gridLines.map((pLine) => (
          <g key={pLine.value}>
            <line
              x1={paddingLeft}
              x2={width - paddingRight}
              y1={pLine.y}
              y2={pLine.y}
              stroke="rgb(109 40 217 / 0.12)"
              strokeWidth="1"
            />
            <text
              x={paddingLeft - 6}
              y={pLine.y + 4}
              textAnchor="end"
              className="fill-zinc-500 text-[10px]"
            >
              {pLine.value}
            </text>
          </g>
        ))}

        <path d={areaPath} fill="url(#elo-area-fill)" />
        <path d={linePath} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />

        {coordinates.map((pPoint, pIndex) => (
          <g key={`${pPoint.x}-${pIndex}`}>
            <circle cx={pPoint.x} cy={pPoint.y} r="4" fill="white" stroke="currentColor" strokeWidth="2" />
            {pPoint.at ? (
              <title>
                {formatChartDate(pPoint.at)} · Elo {pPoint.value}
              </title>
            ) : null}
          </g>
        ))}

        {firstLabel ? (
          <text x={paddingLeft} y={height - 6} className="fill-zinc-500 text-[10px]">
            {firstLabel}
          </text>
        ) : null}
        {lastLabel ? (
          <text
            x={width - paddingRight}
            y={height - 6}
            textAnchor="end"
            className="fill-zinc-500 text-[10px]"
          >
            {lastLabel}
          </text>
        ) : null}
      </svg>
      <p className="text-xs text-zinc-500">
        Survolez un point pour voir la date et l’Elo. Minimum affiché : {min} · maximum : {max}.
      </p>
    </div>
  );
}
