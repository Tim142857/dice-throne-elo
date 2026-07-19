import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserAdminRow } from "@/components/admin/user-admin-row";
import { listManagedUsers } from "@/lib/admin/account-admin";
import { getAuthContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Utilisateurs · Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/admin/utilisateurs");
  }
  if (context.profile?.role !== "admin" || context.profile.status !== "active") {
    redirect("/tableau-de-bord");
  }

  const users = await listManagedUsers();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Administration
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Utilisateurs</h1>
      </div>

      <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
        <table className="min-w-full text-left">
          <thead className="bg-zinc-50 text-xs tracking-wide text-zinc-500 uppercase">
            <tr>
              <th className="px-3 py-3 font-medium">Pseudo</th>
              <th className="px-3 py-3 font-medium">Statut</th>
              <th className="px-3 py-3 font-medium">Rôle</th>
              <th className="px-3 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((pUser) => (
              <UserAdminRow
                key={pUser.id}
                profileId={pUser.id}
                pseudo={pUser.pseudo}
                status={pUser.status}
                role={pUser.role}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
