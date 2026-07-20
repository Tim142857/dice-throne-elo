import Link from "next/link";

import type { PublicValidatedMatch } from "@/lib/matches/public-matches";
import { formatDate } from "@/lib/dates";
import { formatMatchFinalHealthScore } from "@/domain/matches/final-health";

type ValidatedMatchCardProps = {
  match: PublicValidatedMatch;
};

export function ValidatedMatchCard({ match }: ValidatedMatchCardProps) {
  const winnerPseudo =
    match.winnerProfileId === match.player1.id ? match.player1.pseudo : match.player2.pseudo;

  return (
    <article
      id={`match-${match.id}`}
      className="scroll-mt-24 rounded-md border border-zinc-200 bg-white p-4"
    >
      <h2 className="text-base font-semibold text-zinc-950">
        <Link href={`/joueurs/${match.player1.slug}`} className="hover:text-violet-700 hover:underline">
          {match.player1.pseudo}
        </Link>{" "}
        <span className="font-normal text-zinc-600">({match.player1.heroName})</span>{" "}
        <span className="font-normal text-zinc-500">vs</span>{" "}
        <Link href={`/joueurs/${match.player2.slug}`} className="hover:text-violet-700 hover:underline">
          {match.player2.pseudo}
        </Link>{" "}
        <span className="font-normal text-zinc-600">({match.player2.heroName})</span>
      </h2>

      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Date</dt>
          <dd className="font-medium text-zinc-900">{formatDate(match.playedAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Résultat (PV)</dt>
          <dd className="font-medium text-zinc-900">
            {formatMatchFinalHealthScore(
              match.player1RemainingHealth,
              match.player2RemainingHealth,
            )}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Vainqueur</dt>
          <dd className="font-medium text-zinc-900">{winnerPseudo}</dd>
        </div>
      </dl>
    </article>
  );
}
