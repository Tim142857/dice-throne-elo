import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  canDeclareMatches,
  getAccountStatusLabel,
  getAuthContext,
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

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord</h1>
        <p className="text-zinc-600">
          Bonjour
          {context.profile
            ? ` ${context.profile.pseudo}`
            : context.accountRequest
              ? ` ${context.accountRequest.requestedPseudo}`
              : ""}
          .
        </p>
      </header>

      <section className="rounded-md border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium">État du compte</h2>
        <p className="mt-2 text-sm text-zinc-700">{statusLabel}</p>
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
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-700"
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
              href="/mes-matchs"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              Mes matchs
            </Link>
            <Link
              href="/notifications"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              Notifications
            </Link>
          </>
        ) : null}
        <Link
          href="/classements"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
        >
          Voir les classements
        </Link>
        {context.profile?.role === "admin" && context.profile.status === "active" ? (
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Administration
          </Link>
        ) : null}
      </section>
    </main>
  );
}
