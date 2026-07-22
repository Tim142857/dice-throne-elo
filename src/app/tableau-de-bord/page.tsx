import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  canDeclareMatches,
  getAccountStatusLabel,
  getAuthContext,
  getDisplayPseudo,
} from "@/lib/auth/session";
import { getAchievementProgressForProfile } from "@/lib/achievements/service";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = {
  title: "Tableau de bord",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/tableau-de-bord");
  }

  if (context.emailVerified && !context.accountRequest) {
    redirect("/inscription/finaliser");
  }

  const statusLabel = getAccountStatusLabel(context);
  const canPlay = canDeclareMatches(context);
  const displayPseudo = getDisplayPseudo(context);
  const achievements = context.profile
    ? await getAchievementProgressForProfile(context.profile.id).catch(() => null)
    : null;

  const ownedCount = achievements?.owned.length ?? 0;
  const nearest = achievements
    ? achievements.progress
        .map((pProgress) => {
          const definition = achievements.definitions.find((pDef) => pDef.code === pProgress.code);
          const owned = achievements.owned.some((pItem) => pItem.achievementCode === pProgress.code);
          if (owned || !definition || pProgress.target === null || pProgress.target <= 0) {
            return null;
          }
          const remaining = pProgress.target - pProgress.current;
          return { definition, progress: pProgress, remaining };
        })
        .filter((pItem): pItem is NonNullable<typeof pItem> => Boolean(pItem))
        .sort((pLeft, pRight) => pLeft.remaining - pRight.remaining)[0]
    : null;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 lg:py-14">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-[0.18em] text-violet-600 uppercase">
          Espace joueur
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-violet-950">Tableau de bord</h1>
        <p className="text-brand-muted">Bonjour{displayPseudo ? ` ${displayPseudo}` : ""}.</p>
      </header>

      <section className="brand-card rounded-2xl p-6">
        <h2 className="text-lg font-bold text-violet-950">État du compte</h2>
        <p className="mt-2 text-sm text-violet-900">{statusLabel}</p>
        {!context.emailVerified ? (
          <p className="mt-3 text-sm text-zinc-600">
            Un email de confirmation vous a été envoyé. Ouvrez le lien pour poursuivre.
          </p>
        ) : null}
        {context.accountRequest?.status === "pending" ? (
          <p className="mt-3 text-sm text-zinc-600">
            Votre demande est en attente de validation manuelle. Vous pouvez consulter les pages
            publiques, mais pas encore déclarer de match.
          </p>
        ) : null}
        {context.accountRequest?.status === "rejected" ? (
          <p className="mt-3 text-sm text-red-800">
            Motif du refus : {context.accountRequest.rejectionReason ?? "Aucun motif communiqué."}
          </p>
        ) : null}
      </section>

      {achievements ? (
        <section className="brand-card rounded-2xl p-6">
          <h2 className="text-lg font-bold text-violet-950">Badges</h2>
          <p className="mt-2 text-sm text-brand-muted">
            {ownedCount} badge{ownedCount === 1 ? "" : "s"} obtenu{ownedCount === 1 ? "" : "s"}
          </p>
          {achievements.owned.slice(0, 3).length > 0 ? (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {achievements.owned.slice(0, 3).map((pItem) => {
                const definition = achievements.definitions.find(
                  (pDef) => pDef.code === pItem.achievementCode,
                );
                return (
                  <li key={pItem.id} className="flex flex-wrap items-center gap-2">
                    <span aria-hidden>{definition?.icon ?? "🏆"}</span>
                    <span className="font-medium text-violet-950">
                      {definition?.name ?? pItem.achievementCode}
                    </span>
                    <span className="text-xs text-zinc-500">{formatDate(pItem.unlockedAt)}</span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">
              Aucun badge pour l’instant — seuls les matchs joués à partir du 19-07-2026 comptent.
            </p>
          )}
          {nearest ? (
            <p className="mt-4 rounded-xl bg-violet-50 px-3 py-2 text-sm text-violet-900">
              Prochain objectif : <strong>{nearest.definition.name}</strong> (
              {nearest.progress.current}/{nearest.progress.target})
            </p>
          ) : null}
          {context.profile ? (
            <Link
              href={`/joueurs/${context.profile.slug}`}
              className="mt-4 inline-flex text-sm font-medium text-violet-700 underline"
            >
              Voir tous les badges sur mon profil
            </Link>
          ) : null}
        </section>
      ) : null}

      <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {canPlay ? (
          <Link href="/matchs/nouveau" className="btn-primary min-h-11 px-5 py-3">
            Déclarer un match
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-200 px-5 py-3 text-sm font-medium text-zinc-500">
            Déclarer un match (indisponible)
          </span>
        )}
        {context.profile ? (
          <>
            <Link href={`/joueurs/${context.profile.slug}`} className="btn-secondary min-h-11 px-5 py-3">
              Mon profil
            </Link>
            <Link href="/mes-matchs" className="btn-secondary min-h-11 px-5 py-3">
              Mes matchs
            </Link>
            <Link href="/notifications" className="btn-secondary min-h-11 px-5 py-3">
              Notifications
            </Link>
          </>
        ) : null}
        <Link href="/classements" className="btn-secondary min-h-11 px-5 py-3">
          Voir les classements
        </Link>
        <Link href="/records" className="btn-secondary min-h-11 px-5 py-3">
          Records
        </Link>
        {context.profile?.role === "admin" && context.profile.status === "active" ? (
          <Link href="/admin" className="btn-secondary min-h-11 px-5 py-3">
            Administration
          </Link>
        ) : null}
      </section>
    </main>
  );
}
