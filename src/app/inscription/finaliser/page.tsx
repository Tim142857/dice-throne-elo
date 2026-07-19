import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CompleteRegistrationForm } from "@/components/auth/complete-registration-form";
import { getAuthContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Finaliser l’inscription",
};

export const dynamic = "force-dynamic";

export default async function FinalizeRegistrationPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/inscription/finaliser");
  }

  if (context.accountRequest) {
    redirect("/tableau-de-bord");
  }

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Finaliser l’inscription</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Choisissez un pseudo public unique. S’il correspond à un profil historique, l’administrateur
        pourra le relier pour conserver l’Elo existant.
      </p>
      <div className="mt-8">
        <CompleteRegistrationForm />
      </div>
    </main>
  );
}
