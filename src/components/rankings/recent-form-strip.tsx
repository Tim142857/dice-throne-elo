type RecentFormStripProps = {
  results: Array<boolean | null>;
};

export function RecentFormStrip({ results }: RecentFormStripProps) {
  if (results.length === 0) {
    return <p className="text-sm text-zinc-500">Aucun match récent.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {results.map((pResult, pIndex) => {
        const label = pResult === null ? "N" : pResult ? "V" : "D";
        const title = pResult === null ? "Match nul" : pResult ? "Victoire" : "Défaite";
        const className =
          pResult === null
            ? "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200"
            : pResult
              ? "bg-green-100 text-elo-gain ring-1 ring-green-200"
              : "bg-red-100 text-elo-loss ring-1 ring-red-200";
        return (
          <span
            key={pIndex}
            className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md text-xs font-semibold ${className}`}
            title={title}
          >
            {label}
          </span>
        );
      })}
      <span className="text-xs text-zinc-500">({results.length} derniers matchs)</span>
    </div>
  );
}
