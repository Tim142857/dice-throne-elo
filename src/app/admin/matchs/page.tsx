import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Matchs · Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminMatchesPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/admin/matchs");
  }
  if (context.profile?.role !== "admin" || context.profile.status !== "active") {
    redirect("/tableau-de-bord");
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("matches")
    .select("id, status, played_at, player1_id, player2_id, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    status: string;
    played_at: string;
    player1_id: string;
    player2_id: string;
    created_at: string;
  }>;

  const profileIds = [...new Set(rows.flatMap((pRow) => [pRow.player1_id, pRow.player2_id]))];
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Administration
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Matchs</h1>
        <p className="mt-2 text-sm text-zinc-600">50 derniers matchs (tous statuts).</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucun match.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Joueurs</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Lien</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((pRow) => (
                <tr key={pRow.id}>
                  <td className="px-4 py-3">
                    {pseudoById.get(pRow.player1_id) ?? "?"} vs{" "}
                    {pseudoById.get(pRow.player2_id) ?? "?"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{pRow.played_at}</td>
                  <td className="px-4 py-3">{pRow.status}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/mes-matchs/${pRow.id}`}
                      className="font-medium underline hover:text-zinc-950"
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
