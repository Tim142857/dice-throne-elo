"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { getGoogleOAuthUrlAction, signInAction } from "@/app/actions/auth";

type SignInFormProps = {
  nextPath: string;
  initialError?: string | undefined;
};

export function SignInForm({ nextPath, initialError }: SignInFormProps) {
  const router = useRouter();
  const [error, setError] = useState(initialError ?? "");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(pEvent) => {
          pEvent.preventDefault();
          const formData = new FormData(pEvent.currentTarget);
          startTransition(async () => {
            const result = await signInAction(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.push(result.data.redirectTo);
            router.refresh();
          });
        }}
      >
        <input type="hidden" name="next" value={nextPath} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Mot de passe</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            minLength={8}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {isPending ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs tracking-wide text-zinc-400 uppercase">
        <div className="h-px flex-1 bg-zinc-200" />
        ou
        <div className="h-px flex-1 bg-zinc-200" />
      </div>

      <button
        type="button"
        disabled={isPending}
        className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-100 disabled:opacity-60"
        onClick={() => {
          startTransition(async () => {
            const result = await getGoogleOAuthUrlAction(nextPath);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            window.location.href = result.data.url;
          });
        }}
      >
        Continuer avec Google
      </button>
    </div>
  );
}
