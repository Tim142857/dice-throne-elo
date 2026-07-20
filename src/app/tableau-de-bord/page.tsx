import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  canDeclareMatches,
  getAccountStatusLabel,
  getAuthContext,
  getDisplayPseudo,
} from "@/lib/auth/session";

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

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-10 lg:py-14">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-[0.18em] text-violet-600 uppercase">Espace joueur</p>
        <h1 className="text-3xl font-bold tracking-tight text-violet-950">Tableau de bord</h1>
        <p className="text-brand-muted">
          Bonjour{displayPseudo ? ` ${displayPseudo}` : ""}.
        </p>
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
            Motif du refus :{" "}
            {context.accountRequest.rejectionReason ?? "Aucun motif communiqué."}
          </p>
        ) : null}
        {context.accountRequest?.linkedProfileId && context.accountRequest.status === "pending" ? (
          <p className="mt-3 text-sm text-zinc-600">
            Ce pseudo correspond à un profil historique. L’administrateur pourra le relier pour
            conserver Elo et historique.
          </p>
        ) : null}
      </section>

      <section className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {canPlay ? (
          <Link
            href="/matchs/nouveau"
            className="btn-primary min-h-11 px-5 py-3"
          >
            Déclarer un match
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-200 px-5 py-3 text-sm font-medium text-zinc-500">
            Déclarer un match (indisponible)
          </span>
        )}
        {context.profile ? (
          <>
            <Link
              href={`/joueurs/${context.profile.slug}`}
              className="btn-secondary min-h-11 px-5 py-3"
            >
              Mon profil
            </Link>
            <Link
              href="/mes-matchs"
              className="btn-secondary min-h-11 px-5 py-3"
            >
              Mes matchs
            </Link>
            <Link
              href="/notifications"
              className="btn-secondary min-h-11 px-5 py-3"
            >
              Notifications
            </Link>
          </>
        ) : null}
        <Link
          href="/classements"
          className="btn-secondary min-h-11 px-5 py-3"
        >
          Voir les classements
        </Link>
        {context.profile?.role === "admin" && context.profile.status === "active" ? (
          <Link
            href="/admin"
            className="btn-secondary min-h-11 px-5 py-3"
          >
            Administration
          </Link>
        ) : null}
      </section>
    </main>
  );
}
