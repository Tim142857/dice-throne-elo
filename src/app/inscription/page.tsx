import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "@/components/auth/sign-up-form";

export const metadata: Metadata = {
  title: "Inscription",
};

export default function InscriptionPage() {
  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Inscription</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Après vérification de l’email, un administrateur devra approuver votre compte avant que vous
        puissiez déclarer des matchs.{" "}
        <Link href="/connexion" className="font-medium text-zinc-950 underline">
          Se connecter
        </Link>
      </p>
      <div className="mt-8">
        <SignUpForm />
      </div>
    </main>
  );
}
