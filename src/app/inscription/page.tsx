import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "@/components/auth/sign-up-form";
import { AuthPageShell } from "@/components/layout/auth-page-shell";

export const metadata: Metadata = {
  title: "Inscription",
};

export default function InscriptionPage() {
  return (
    <AuthPageShell
      title="Inscription"
      description={
        <>
          Après vérification de l’email, un administrateur devra approuver votre compte avant que
          vous puissiez déclarer des matchs.{" "}
          <Link href="/connexion" className="font-semibold text-violet-700 underline">
            Se connecter
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthPageShell>
  );
}
