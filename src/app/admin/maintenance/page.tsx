import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MaintenancePanel } from "@/components/admin/maintenance-panel";
import { getAuthContext } from "@/lib/auth/session";
import { listValidatedMatchesForAdmin } from "@/lib/matches/recompute-ratings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Maintenance · Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminMaintenancePage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/admin/maintenance");
  }
  if (context.profile?.role !== "admin" || context.profile.status !== "active") {
    redirect("/tableau-de-bord");
  }

  const validatedMatches = await listValidatedMatchesForAdmin();
  const admin = createSupabaseAdminClient();
  const profileIds = [
    ...new Set(validatedMatches.flatMap((pMatch) => [pMatch.player1Id, pMatch.player2Id])),
  ];

  const profilesResponse =
    profileIds.length > 0
      ? await admin.from("profiles").select("id, pseudo").in("id", profileIds)
      : { data: [], error: null };

  if (profilesResponse.error) {
    throw new Error(profilesResponse.error.message);
  }

  const pseudoById = new Map(
    ((profilesResponse.data ?? []) as Array<{ id: string; pseudo: string }>).map((pRow) => [
      pRow.id,
      pRow.pseudo,
    ]),
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Administration
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Maintenance</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Recalcul déterministe des classements et annulation administrative.
        </p>
      </div>

      <MaintenancePanel
        validatedMatches={validatedMatches.map((pMatch) => ({
          id: pMatch.id,
          label: `${pseudoById.get(pMatch.player1Id) ?? "?"} vs ${pseudoById.get(pMatch.player2Id) ?? "?"} · ${pMatch.playedAt}`,
        }))}
      />
    </main>
  );
}
