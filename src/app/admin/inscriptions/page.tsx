import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountRequestReviewCard } from "@/components/admin/account-request-review-card";
import {
  listPendingAccountRequests,
  listPreloadedProfiles,
} from "@/lib/admin/account-admin";
import { getAuthContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Inscriptions · Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminRegistrationsPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/admin/inscriptions");
  }
  if (context.profile?.role !== "admin" || context.profile.status !== "active") {
    redirect("/tableau-de-bord");
  }

  const [pending, preloaded] = await Promise.all([
    listPendingAccountRequests(),
    listPreloadedProfiles(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Administration
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Inscriptions</h1>
      </div>

      {pending.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucune demande en attente.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {pending.map((pItem) => (
            <AccountRequestReviewCard
              key={pItem.request.id}
              requestId={pItem.request.id}
              requestedPseudo={pItem.request.requestedPseudo}
              presentationMessage={pItem.request.presentationMessage}
              suggestedPreloadedId={pItem.request.linkedProfileId}
              preloadedOptions={preloaded.map((pProfile) => ({
                id: pProfile.id,
                pseudo: pProfile.pseudo,
              }))}
              createdAt={pItem.request.createdAt}
            />
          ))}
        </div>
      )}
    </main>
  );
}
