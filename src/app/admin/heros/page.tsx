import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateHeroForm } from "@/components/admin/create-hero-form";
import { HeroAdminCard } from "@/components/admin/hero-admin-card";
import { listAllHeroes } from "@/lib/admin/hero-admin";
import { getAuthContext } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Héros · Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminHeroesPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/connexion?next=/admin/heros");
  }
  if (context.profile?.role !== "admin" || context.profile.status !== "active") {
    redirect("/tableau-de-bord");
  }

  const heroes = await listAllHeroes();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <div>
        <Link href="/admin" className="text-sm text-zinc-600 hover:text-zinc-950">
          ← Administration
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Héros</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Un héros inactif reste visible dans l’historique, mais ne peut plus être choisi pour un
          nouveau match.
        </p>
      </div>

      <CreateHeroForm />

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">
          {heroes.length} héros
        </h2>
        {heroes.map((pHero) => (
          <HeroAdminCard
            key={pHero.id}
            heroId={pHero.id}
            name={pHero.name}
            slug={pHero.slug}
            isActive={pHero.isActive}
            updatedAt={pHero.updatedAt}
          />
        ))}
      </section>
    </main>
  );
}
