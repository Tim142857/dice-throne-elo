import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getHeroDetailStats } from "@/lib/stats/queries";
import { formatDate } from "@/lib/dates";

type HeroDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ min?: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: HeroDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const stats = await getHeroDetailStats(slug);
    if (!stats) {
      return { title: "Héros introuvable" };
    }
    return {
      title: stats.hero.name,
      description: `Statistiques du héros ${stats.hero.name}.`,
    };
  } catch {
    return { title: "Héros" };
  }
}

export default async function HeroDetailPage({ params, searchParams }: HeroDetailPageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const minMatchups = Math.max(1, Number(query.min || 3) || 3);

  let stats = null;
  try {
    stats = await getHeroDetailStats(slug, minMatchups);
  } catch {
    notFound();
  }
  if (!stats) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/heros" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Tous les héros
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">{stats.hero.name}</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {stats.hero.isActive ? "Actif" : "Inactif"} ·{" "}
          <Link
            href={`/confrontations/heros?a=${stats.hero.slug}`}
            className="underline"
          >
            Comparer
          </Link>
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Matchs" value={String(stats.matchesCount)} />
        <Stat label="Victoires" value={String(stats.winsCount)} />
        <Stat label="Défaites" value={String(stats.lossesCount)} />
        <Stat label="Taux de victoire" value={`${stats.winRateLabel} (${stats.matchesCount})`} />
        <Stat label="Joueurs différents" value={String(stats.distinctPlayers)} />
        <Stat
          label="Popularité"
          value={`${Math.round(stats.popularityShare * 1000) / 10} %`}
        />
        <Stat
          label="Meilleur joueur–héros"
          value={
            stats.bestPlayerHero
              ? `${stats.bestPlayerHero.pseudo} (${stats.bestPlayerHero.ratingDisplay})`
              : "—"
          }
        />
      </section>

      <form className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Matchs min. pour les match-ups</span>
          <input
            name="min"
            type="number"
            min={1}
            defaultValue={minMatchups}
            className="w-28 rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-50"
        >
          Appliquer
        </button>
      </form>

      <section className="grid gap-6 lg:grid-cols-2">
        <MatchupList title="Match-ups favorables" rows={stats.favorable} />
        <MatchupList title="Match-ups défavorables" rows={stats.unfavorable} />
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium">Tous les match-ups</h2>
        {stats.allMatchups.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Aucun affrontement enregistré.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {stats.allMatchups.map((pRow) => (
              <li key={pRow.heroSlug} className="flex justify-between gap-3 py-2">
                <Link href={`/heros/${pRow.heroSlug}`} className="hover:underline">
                  vs {pRow.heroName}
                </Link>
                <span className="text-zinc-500">
                  {pRow.winRateLabel} ({pRow.matchesCount} · {pRow.wins}–{pRow.losses})
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium">Matchs récents</h2>
        {stats.recentMatches.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Aucun match.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {stats.recentMatches.map((pMatch) => (
              <li key={pMatch.id} className="flex flex-wrap justify-between gap-2 py-2">
                <div>
                  <Link href={`/matchs#match-${pMatch.id}`} className="font-medium hover:underline">
                    {pMatch.playerPseudo}
                  </Link>
                  <p className="text-zinc-500">
                    {formatDate(pMatch.playedAt)} · vs {pMatch.opponentHeroName}
                  </p>
                </div>
                <span
                  className={
                    pMatch.won === null
                      ? "text-zinc-600"
                      : pMatch.won
                        ? "text-elo-gain"
                        : "text-elo-loss"
                  }
                >
                  {pMatch.won === null ? "Nul" : pMatch.won ? "Victoire" : "Défaite"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4">
      <p className="text-xs tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function MatchupList({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    heroName: string;
    heroSlug: string;
    wins: number;
    losses: number;
    matchesCount: number;
    winRateLabel: string;
  }>;
}) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-medium">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Pas assez de matchs pour ce filtre.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-100 text-sm">
          {rows.map((pRow) => (
            <li key={pRow.heroSlug} className="flex justify-between gap-3 py-2">
              <Link href={`/heros/${pRow.heroSlug}`} className="hover:underline">
                vs {pRow.heroName}
              </Link>
              <span className="text-zinc-500">
                {pRow.winRateLabel} ({pRow.matchesCount})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
