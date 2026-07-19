import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAccountStatusLabel, getAuthContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Compte",
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/compte");
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Compte</h1>

      <dl className="grid gap-4 rounded-md border border-zinc-200 bg-white p-5 text-sm">
        <div>
          <dt className="font-medium text-zinc-500">Email</dt>
          <dd className="mt-1 text-zinc-900">{context.user.email}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Pseudo</dt>
          <dd className="mt-1 text-zinc-900">
            {context.profile?.pseudo ??
              context.accountRequest?.requestedPseudo ??
              "Non défini"}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Statut</dt>
          <dd className="mt-1 text-zinc-900">{getAccountStatusLabel(context)}</dd>
        </div>
        <div>
          <dt className="font-medium text-zinc-500">Email vérifié</dt>
          <dd className="mt-1 text-zinc-900">{context.emailVerified ? "Oui" : "Non"}</dd>
        </div>
      </dl>

      <p className="text-sm text-zinc-600">
        Le pseudo ne peut pas être modifié librement après validation. Contactez l’administrateur
        en cas de correction nécessaire.
      </p>
    </main>
  );
}
