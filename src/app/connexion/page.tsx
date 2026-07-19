import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Connexion",
};

type ConnexionPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function ConnexionPage({ searchParams }: ConnexionPageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/tableau-de-bord";
  const initialError =
    params.error === "oauth"
      ? "La connexion Google a échoué."
      : params.error === "missing_code"
        ? "Code d’authentification manquant."
        : params.error
          ? decodeURIComponent(params.error)
          : undefined;

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Connexion</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-medium text-zinc-950 underline">
          Créer un compte
        </Link>
      </p>
      <div className="mt-8">
        <SignInForm nextPath={nextPath} initialError={initialError} />
      </div>
    </main>
  );
}
