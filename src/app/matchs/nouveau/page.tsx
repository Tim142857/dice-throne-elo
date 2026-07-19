import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { CreateMatchForm } from "@/components/matches/create-match-form";
import { listActiveHeroes } from "@/lib/admin/hero-admin";
import { getAuthContext } from "@/lib/auth/session";
import { listOpponentCandidates } from "@/lib/matches/match-service";

export const metadata: Metadata = {
  title: "Nouveau match",
};

export const dynamic = "force-dynamic";

export default async function NewMatchPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/matchs/nouveau");
  }
  if (context.profile?.status !== "active") {
    redirect("/tableau-de-bord");
  }

  const [opponents, heroes] = await Promise.all([
    listOpponentCandidates(context.profile.id),
    listActiveHeroes(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Déclarer un match</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Vous devez être l’un des deux joueurs. L’adversaire devra valider le résultat avant toute
          mise à jour Elo.
        </p>
      </header>
      <CreateMatchForm
        currentProfileId={context.profile.id}
        currentPseudo={context.profile.pseudo}
        opponents={opponents.map((pProfile) => ({
          id: pProfile.id,
          label: `${pProfile.pseudo}${pProfile.status === "preloaded" ? " (historique)" : ""}`,
        }))}
        heroes={heroes.map((pHero) => ({ id: pHero.id, label: pHero.name }))}
      />
    </main>
  );
}
