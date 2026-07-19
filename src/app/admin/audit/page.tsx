import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Audit · Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/admin/audit");
  }
  if (context.profile?.role !== "admin" || context.profile.status !== "active") {
    redirect("/tableau-de-bord");
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, actor_profile_id, created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as Array<{
    id: string;
    action: string;
    entity_type: string;
    entity_id: string | null;
    actor_profile_id: string | null;
    created_at: string;
  }>;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Administration
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Journal d’audit</h1>
        <p className="mt-2 text-sm text-zinc-600">80 dernières actions sensibles.</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed border-zinc-300 bg-white p-5 text-sm text-zinc-600">
          Aucune entrée d’audit.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-zinc-600">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entité</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((pRow) => (
                <tr key={pRow.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {new Date(pRow.created_at).toLocaleString("fr-FR")}
                  </td>
                  <td className="px-4 py-3 font-medium">{pRow.action}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    {pRow.entity_type}
                    {pRow.entity_id ? ` · ${pRow.entity_id.slice(0, 8)}…` : ""}
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
