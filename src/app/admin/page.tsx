import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/session";
import { listPendingAccountRequests } from "@/lib/admin/account-admin";

export const metadata: Metadata = {
  title: "Administration",
};

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/admin");
  }
  if (context.profile?.role !== "admin" || context.profile.status !== "active") {
    redirect("/tableau-de-bord");
  }

  const pending = await listPendingAccountRequests();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Administration</h1>
        <p className="mt-2 text-zinc-600">Gestion des comptes, inscriptions et maintenance.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/inscriptions"
          className="rounded-md border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
        >
          <h2 className="font-medium">Inscriptions</h2>
          <p className="mt-1 text-sm text-zinc-600">
            {pending.length} demande{pending.length === 1 ? "" : "s"} en attente
          </p>
        </Link>
        <Link
          href="/admin/utilisateurs"
          className="rounded-md border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
        >
          <h2 className="font-medium">Utilisateurs</h2>
          <p className="mt-1 text-sm text-zinc-600">Suspendre, réactiver, corriger un pseudo</p>
        </Link>
        <Link
          href="/admin/matchs"
          className="rounded-md border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
        >
          <h2 className="font-medium">Matchs</h2>
          <p className="mt-1 text-sm text-zinc-600">Consulter les matchs récents</p>
        </Link>
        <Link
          href="/admin/litiges"
          className="rounded-md border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
        >
          <h2 className="font-medium">Litiges</h2>
          <p className="mt-1 text-sm text-zinc-600">Trancher les matchs en désaccord</p>
        </Link>
        <Link
          href="/admin/heros"
          className="rounded-md border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
        >
          <h2 className="font-medium">Héros</h2>
          <p className="mt-1 text-sm text-zinc-600">Ajouter, renommer, activer ou désactiver</p>
        </Link>
        <Link
          href="/admin/audit"
          className="rounded-md border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
        >
          <h2 className="font-medium">Audit</h2>
          <p className="mt-1 text-sm text-zinc-600">Journal des actions sensibles</p>
        </Link>
        <Link
          href="/admin/maintenance"
          className="rounded-md border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
        >
          <h2 className="font-medium">Maintenance</h2>
          <p className="mt-1 text-sm text-zinc-600">Recalcul Elo, cohérence, annulation admin</p>
        </Link>
      </section>
    </main>
  );
}
