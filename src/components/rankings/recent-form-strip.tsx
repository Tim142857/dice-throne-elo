type RecentFormStripProps = {
  results: boolean[];
};

export function RecentFormStrip({ results }: RecentFormStripProps) {
  if (results.length === 0) {
    return <p className="text-sm text-zinc-500">Aucun match récent.</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {results.map((pWon, pIndex) => (
        <span
          key={pIndex}
          className={`inline-flex h-8 min-w-8 items-center justify-center rounded-md text-xs font-semibold ${
            pWon
              ? "bg-green-100 text-elo-gain ring-1 ring-green-200"
              : "bg-red-100 text-elo-loss ring-1 ring-red-200"
          }`}
          title={pWon ? "Victoire" : "Défaite"}
        >
          {pWon ? "V" : "D"}
        </span>
      ))}
      <span className="text-xs text-zinc-500">({results.length} derniers matchs)</span>
    </div>
  );
}
