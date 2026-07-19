import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EloSparkline } from "@/components/rankings/elo-sparkline";
import { getPlayerPublicProfileBySlug } from "@/lib/rankings/queries";

type PlayerProfilePageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PlayerProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const profile = await getPlayerPublicProfileBySlug(slug);
    if (!profile) {
      return { title: "Joueur introuvable" };
    }
    return {
      title: profile.profile.pseudo,
      description: `Profil Elo de ${profile.profile.pseudo} sur Dice Throne.`,
    };
  } catch {
    return { title: "Joueur" };
  }
}

export default async function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const { slug } = await params;
  let profile = null;
  try {
    profile = await getPlayerPublicProfileBySlug(slug);
  } catch {
    notFound();
  }
  if (!profile) {
    notFound();
  }

  const isHistorical = profile.profile.status === "preloaded" || !profile.profile.approvedAt;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-10 px-6 py-16">
      <header className="flex flex-col gap-2">
        <Link href="/classements" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Classements
        </Link>
        <h1 className="text-3xl font-semibold tracking-tight">{profile.profile.pseudo}</h1>
        <p className="text-sm text-zinc-600">
          {isHistorical && profile.profile.status === "preloaded"
            ? "Profil historique"
            : profile.profile.approvedAt
              ? `Compte depuis le ${new Date(profile.profile.approvedAt).toLocaleDateString("fr-FR")}`
              : `Profil créé le ${new Date(profile.profile.createdAt).toLocaleDateString("fr-FR")}`}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Elo" value={String(profile.ratingDisplay)} />
        <Stat label="Rang" value={profile.rank ? `#${profile.rank}` : "—"} />
        <Stat label="Matchs" value={String(profile.matchesCount)} />
        <Stat label="Taux de victoire" value={profile.winRateLabel} />
        <Stat label="Victoires" value={String(profile.winsCount)} />
        <Stat label="Défaites" value={String(profile.lossesCount)} />
        <Stat label="Série actuelle" value={String(profile.currentStreak)} />
        <Stat label="Meilleure série" value={String(profile.bestWinStreak)} />
        <Stat label="Meilleur Elo" value={String(profile.bestRatingDisplay)} />
        <Stat
          label="Pire Elo"
          value={profile.worstRatingDisplay === null ? "—" : String(profile.worstRatingDisplay)}
        />
        <Stat label="Adversaires" value={String(profile.distinctOpponents)} />
        <Stat
          label="Héros le plus joué"
          value={
            profile.mostPlayedHero
              ? `${profile.mostPlayedHero.name} (${profile.mostPlayedHero.matchesCount})`
              : "—"
          }
        />
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium">Évolution de l’Elo</h2>
        <div className="mt-4">
          <EloSparkline points={profile.eloHistory} />
        </div>
        {profile.bestHero ? (
          <p className="mt-3 text-sm text-zinc-600">
            Meilleure combinaison :{" "}
            <Link href={`/heros/${profile.bestHero.slug}`} className="underline">
              {profile.bestHero.name}
            </Link>{" "}
            ({profile.bestHero.ratingDisplay})
          </p>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-medium">Héros joués</h2>
          {profile.heroDistribution.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Aucun héros pour l’instant.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 text-sm">
              {profile.heroDistribution.map((pHero) => (
                <li key={pHero.slug} className="flex justify-between gap-3 py-2">
                  <Link href={`/heros/${pHero.slug}`} className="hover:underline">
                    {pHero.name}
                  </Link>
                  <span className="text-zinc-500">{pHero.matchesCount} matchs</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-medium">Face-à-face</h2>
          {profile.recordsVsOpponents.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Aucun adversaire.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-100 text-sm">
              {profile.recordsVsOpponents.map((pRow) => (
                <li key={pRow.opponentSlug} className="flex justify-between gap-3 py-2">
                  <Link href={`/joueurs/${pRow.opponentSlug}`} className="hover:underline">
                    {pRow.opponentPseudo}
                  </Link>
                  <span className="text-zinc-500">
                    {pRow.wins}–{pRow.losses}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium">Matchs récents</h2>
        {profile.recentMatches.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Aucun match validé.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100 text-sm">
            {profile.recentMatches.map((pMatch) => (
              <li key={pMatch.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div>
                  <Link href={`/matchs/${pMatch.id}`} className="font-medium hover:underline">
                    vs {pMatch.opponentPseudo}
                  </Link>
                  <p className="text-zinc-500">
                    {pMatch.playedAt} · {pMatch.heroName}
                  </p>
                </div>
                <span
                  className={
                    pMatch.won
                      ? "font-medium text-elo-gain"
                      : "font-medium text-elo-loss"
                  }
                >
                  {pMatch.won ? "Victoire" : "Défaite"}
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
      <p className="mt-1 text-lg font-semibold text-zinc-950">{value}</p>
    </div>
  );
}
