import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { EloSparkline } from "@/components/rankings/elo-sparkline";
import { RecentFormStrip } from "@/components/rankings/recent-form-strip";
import { AchievementBoard } from "@/components/achievements/achievement-board";
import { formatEloDeltaDisplay } from "@/domain/elo/calculate";
import { formatDate } from "@/lib/dates";
import { getAuthContext } from "@/lib/auth/session";
import {
  getAchievementProgressForProfile,
  listPlayerAchievements,
} from "@/lib/achievements/service";
import { getPlayerMetaBySlug, getPlayerPublicProfileBySlug } from "@/lib/rankings/queries";
import { formatHpStat } from "@/domain/stats/health";

type PlayerProfilePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ onglet?: string }>;
};

const tabs = [
  { key: "stats", label: "Stats" },
  { key: "insights", label: "Insights" },
  { key: "badges", label: "Badges" },
  { key: "matchs", label: "Matchs" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PlayerProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const meta = await getPlayerMetaBySlug(slug);
    if (!meta) {
      return { title: "Joueur introuvable" };
    }
    return {
      title: meta.pseudo,
      description: `Profil Elo de ${meta.pseudo} sur Dice Throne.`,
    };
  } catch {
    return { title: "Joueur" };
  }
}

export default async function PlayerProfilePage({ params, searchParams }: PlayerProfilePageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const activeTab: TabKey =
    tabs.find((pTab) => pTab.key === query.onglet)?.key ?? "stats";

  const [authContext, profileResult] = await Promise.all([
    getAuthContext(),
    getPlayerPublicProfileBySlug(slug).catch(() => null),
  ]);

  if (!profileResult) {
    notFound();
  }

  const profile = profileResult;

  const [achievements, ownedBadges] = await Promise.all([
    activeTab === "badges"
      ? getAchievementProgressForProfile(profile.profile.id).catch(() => null)
      : Promise.resolve(null),
    activeTab === "badges"
      ? Promise.resolve(null)
      : listPlayerAchievements(profile.profile.id).catch(() => []),
  ]);

  const badgeCount = achievements?.owned.length ?? ownedBadges?.length ?? 0;
  const isOwnProfile = authContext?.profile?.slug === profile.profile.slug;
  const isHistorical = profile.profile.status === "preloaded" || !profile.profile.approvedAt;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10 lg:py-14">
      <header className="flex flex-col gap-2">
        <Link href="/classements" className="text-sm text-brand-muted hover:text-violet-950">
          ← Classements
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-violet-950">
            {profile.profile.pseudo}
          </h1>
          {isOwnProfile ? (
            <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-800">
              Mon profil
            </span>
          ) : null}
        </div>
        <p className="text-sm text-brand-muted">
          {isHistorical && profile.profile.status === "preloaded"
            ? "Profil historique"
            : profile.profile.approvedAt
              ? `Compte depuis le ${formatDate(profile.profile.approvedAt)}`
              : `Profil créé le ${formatDate(profile.profile.createdAt)}`}
          {" · "}
          Elo {profile.ratingDisplay}
          {profile.rank ? ` · #${profile.rank}` : ""}
        </p>
      </header>

      <nav
        className="flex flex-wrap gap-2 border-b border-violet-100 pb-3"
        aria-label="Sections du profil"
      >
        {tabs.map((pTab) => {
          const isActive = pTab.key === activeTab;
          const label =
            pTab.key === "badges" ? `${pTab.label} (${badgeCount})` : pTab.label;
          return (
            <Link
              key={pTab.key}
              href={`/joueurs/${slug}?onglet=${pTab.key}`}
              aria-current={isActive ? "page" : undefined}
              className={
                isActive
                  ? "inline-flex min-h-10 items-center rounded-lg bg-violet-900 px-3 text-sm font-medium text-white"
                  : "inline-flex min-h-10 items-center rounded-lg border border-violet-200 px-3 text-sm font-medium text-violet-900/80 hover:bg-violet-50"
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {activeTab === "stats" ? (
        <div className="flex flex-col gap-6">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Elo" value={String(profile.ratingDisplay)} highlight />
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

          <section className="brand-card rounded-2xl p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-violet-950">Évolution de l’Elo</h2>
                {profile.eloDeltaRecent5 !== null ? (
                  <p className="mt-1 text-sm text-brand-muted">
                    Variation sur les 5 derniers matchs :{" "}
                    <span
                      className={
                        profile.eloDeltaRecent5 >= 0
                          ? "font-semibold text-elo-gain"
                          : "font-semibold text-elo-loss"
                      }
                    >
                      {formatEloDeltaDisplay(profile.eloDeltaRecent5)}
                    </span>
                  </p>
                ) : null}
              </div>
              {profile.bestHero ? (
                <p className="text-sm text-brand-muted">
                  Meilleur Elo joueur–héros :{" "}
                  <Link
                    href={`/heros/${profile.bestHero.slug}`}
                    className="font-medium text-violet-800 underline"
                  >
                    {profile.bestHero.name}
                  </Link>{" "}
                  ({profile.bestHero.ratingDisplay})
                </p>
              ) : null}
            </div>
            <div className="mt-4">
              <EloSparkline points={profile.eloHistory} />
            </div>
          </section>

          <section className="brand-card rounded-2xl p-5">
            <h2 className="text-lg font-bold text-violet-950">Forme récente</h2>
            <div className="mt-3">
              <RecentFormStrip results={profile.recentForm} />
            </div>
          </section>

          <section className="brand-card rounded-2xl p-5">
            <h2 className="text-lg font-bold text-violet-950">Points de vie (victoires)</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Stat label="Moyenne" value={formatHpStat(profile.healthStats.averageWinnerHp)} />
              <Stat label="Médiane" value={formatHpStat(profile.healthStats.medianWinnerHp)} />
              <Stat
                label="Victoire la plus serrée"
                value={
                  profile.healthStats.closestWinHp === null
                    ? "—"
                    : `${profile.healthStats.closestWinHp} PV`
                }
              />
              <Stat
                label="Victoire la plus large"
                value={
                  profile.healthStats.largestWinHp === null
                    ? "—"
                    : `${profile.healthStats.largestWinHp} PV`
                }
              />
              <Stat label="Victoires ≤ 5 PV" value={String(profile.healthStats.winsWithAtMost5Hp)} />
              <Stat
                label="Victoires ≥ 20 PV"
                value={String(profile.healthStats.winsWithAtLeast20Hp)}
              />
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "insights" ? (
        <div className="flex flex-col gap-6">
          <section className="brand-card rounded-2xl p-5">
            <h2 className="text-lg font-bold text-violet-950">Insights</h2>
            <p className="mt-1 text-sm text-brand-muted">
              Analyse basée sur au moins 3 matchs par adversaire ou héros.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InsightCard
                title="Nemesis"
                subtitle="Adversaire le plus difficile"
                empty="Pas encore assez de confrontations."
                item={profile.nemesis}
                tone="loss"
                renderValue={(pItem) => (
                  <>
                    <Link
                      href={`/joueurs/${pItem.opponentSlug}`}
                      className="font-semibold hover:underline"
                    >
                      {pItem.opponentPseudo}
                    </Link>
                    <p className="mt-1 text-sm text-brand-muted">
                      {pItem.wins}–{pItem.losses} · {pItem.winRateLabel} de victoires
                    </p>
                  </>
                )}
              />
              <InsightCard
                title="Proie favorite"
                subtitle="Adversaire le plus battu"
                empty="Pas encore assez de confrontations."
                item={profile.favoriteOpponent}
                tone="gain"
                renderValue={(pItem) => (
                  <>
                    <Link
                      href={`/joueurs/${pItem.opponentSlug}`}
                      className="font-semibold hover:underline"
                    >
                      {pItem.opponentPseudo}
                    </Link>
                    <p className="mt-1 text-sm text-brand-muted">
                      {pItem.wins}–{pItem.losses} · {pItem.winRateLabel} de victoires
                    </p>
                  </>
                )}
              />
              <InsightCard
                title="Héros le plus efficace"
                subtitle="Meilleur taux de victoire"
                empty="Pas encore assez de matchs avec un héros."
                item={profile.bestHeroByWinRate}
                tone="gain"
                renderValue={(pItem) => (
                  <>
                    <Link href={`/heros/${pItem.slug}`} className="font-semibold hover:underline">
                      {pItem.name}
                    </Link>
                    <p className="mt-1 text-sm text-brand-muted">
                      {pItem.winRateLabel} · {pItem.matchesCount} matchs
                    </p>
                  </>
                )}
              />
              <InsightCard
                title="Héros le plus difficile"
                subtitle="Pire taux de victoire"
                empty="Pas encore assez de matchs avec un héros."
                item={profile.worstHeroByWinRate}
                tone="loss"
                renderValue={(pItem) => (
                  <>
                    <Link href={`/heros/${pItem.slug}`} className="font-semibold hover:underline">
                      {pItem.name}
                    </Link>
                    <p className="mt-1 text-sm text-brand-muted">
                      {pItem.winRateLabel} · {pItem.matchesCount} matchs
                    </p>
                  </>
                )}
              />
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="brand-card rounded-2xl p-5">
              <h2 className="text-lg font-bold text-violet-950">Héros joués</h2>
              {profile.heroDistribution.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Aucun héros pour l’instant.</p>
              ) : (
                <ul className="mt-3 divide-y divide-violet-100 text-sm">
                  {profile.heroDistribution.map((pHero) => (
                    <li key={pHero.slug} className="flex justify-between gap-3 py-2">
                      <Link href={`/heros/${pHero.slug}`} className="font-medium hover:underline">
                        {pHero.name}
                      </Link>
                      <span className="text-right text-brand-muted">
                        {pHero.matchesCount} matchs · {pHero.winRateLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="brand-card rounded-2xl p-5">
              <h2 className="text-lg font-bold text-violet-950">Face-à-face</h2>
              {profile.recordsVsOpponents.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">Aucun adversaire.</p>
              ) : (
                <ul className="mt-3 divide-y divide-violet-100 text-sm">
                  {profile.recordsVsOpponents.map((pRow) => {
                    const isNemesis = profile.nemesis?.opponentSlug === pRow.opponentSlug;
                    const isFavorite =
                      profile.favoriteOpponent?.opponentSlug === pRow.opponentSlug;

                    return (
                      <li key={pRow.opponentSlug} className="flex justify-between gap-3 py-2">
                        <div className="min-w-0">
                          <Link
                            href={`/joueurs/${pRow.opponentSlug}`}
                            className="font-medium hover:underline"
                          >
                            {pRow.opponentPseudo}
                          </Link>
                          {isNemesis || isFavorite ? (
                            <p className="mt-0.5 text-xs text-brand-muted">
                              {isNemesis ? "Nemesis" : null}
                              {isNemesis && isFavorite ? " · " : null}
                              {isFavorite ? "Proie favorite" : null}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-right text-brand-muted">
                          {pRow.wins}–{pRow.losses}
                          <span className="block text-xs">{pRow.winRateLabel}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {activeTab === "badges" ? (
        achievements ? (
          <AchievementBoard
            owned={achievements.owned}
            progress={achievements.progress}
            definitions={achievements.definitions}
          />
        ) : (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Badges indisponibles pour le moment.
          </p>
        )
      ) : null}

      {activeTab === "matchs" ? (
        <section className="brand-card rounded-2xl p-5">
          <h2 className="text-lg font-bold text-violet-950">Matchs récents</h2>
          {profile.recentMatches.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">Aucun match validé.</p>
          ) : (
            <ul className="mt-3 divide-y divide-violet-100 text-sm">
              {profile.recentMatches.map((pMatch) => (
                <li
                  key={pMatch.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <div>
                    <Link
                      href={`/matchs#match-${pMatch.id}`}
                      className="font-medium hover:underline"
                    >
                      vs {pMatch.opponentPseudo}
                    </Link>
                    <p className="text-brand-muted">
                      {formatDate(pMatch.playedAt)} · {pMatch.heroName}
                      {pMatch.won ? ` · ${pMatch.winnerRemainingHealth} PV` : ""}
                    </p>
                  </div>
                  <span
                    className={
                      pMatch.won ? "font-semibold text-elo-gain" : "font-semibold text-elo-loss"
                    }
                  >
                    {pMatch.won ? "Victoire" : "Défaite"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`brand-card rounded-xl p-4 ${highlight ? "ring-2 ring-violet-200" : ""}`}>
      <p className="text-xs tracking-wide text-brand-muted uppercase">{label}</p>
      <p className={`mt-1 text-lg font-bold ${highlight ? "text-violet-950" : "text-violet-900"}`}>
        {value}
      </p>
    </div>
  );
}

function InsightCard<T>({
  title,
  subtitle,
  empty,
  item,
  tone,
  renderValue,
}: {
  title: string;
  subtitle: string;
  empty: string;
  item: T | null;
  tone: "gain" | "loss";
  renderValue: (pItem: T) => ReactNode;
}) {
  return (
    <article
      className={`rounded-xl border p-4 ${
        tone === "gain" ? "border-green-200 bg-green-50/70" : "border-red-200 bg-red-50/70"
      }`}
    >
      <p className="text-xs font-semibold tracking-wide text-zinc-600 uppercase">{title}</p>
      <p className="mt-0.5 text-sm text-brand-muted">{subtitle}</p>
      <div className="mt-3 text-violet-950">{item ? renderValue(item) : empty}</div>
    </article>
  );
}
