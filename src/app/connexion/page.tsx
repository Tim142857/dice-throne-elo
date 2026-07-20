import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "@/components/auth/sign-in-form";
import { AuthPageShell } from "@/components/layout/auth-page-shell";

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
    <AuthPageShell
      title="Connexion"
      description={
        <>
          Pas encore de compte ?{" "}
          <Link href="/inscription" className="font-semibold text-violet-700 underline">
            Créer un compte
          </Link>
        </>
      }
    >
      <SignInForm nextPath={nextPath} initialError={initialError} />
    </AuthPageShell>
  );
}
