"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { getGoogleOAuthUrlAction, signUpAction } from "@/app/actions/auth";

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <form
        className="flex flex-col gap-4"
        onSubmit={(pEvent) => {
          pEvent.preventDefault();
          const formData = new FormData(pEvent.currentTarget);
          startTransition(async () => {
            setError("");
            setMessage("");
            const result = await signUpAction(formData);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            setMessage(result.message ?? "Compte créé.");
            router.refresh();
          });
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Pseudo public</span>
          <input
            name="pseudo"
            type="text"
            required
            minLength={3}
            maxLength={24}
            autoComplete="username"
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
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
            autoComplete="new-password"
            minLength={8}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-800">Message à l’administrateur (optionnel)</span>
          <textarea
            name="presentationMessage"
            rows={3}
            maxLength={500}
            className="rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p
            className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            role="status"
          >
            {message}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          {isPending ? "Création…" : "Créer mon compte"}
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
            const result = await getGoogleOAuthUrlAction("/inscription/finaliser");
            if (!result.ok) {
              setError(result.error);
              return;
            }
            window.location.href = result.data.url;
          });
        }}
      >
        S’inscrire avec Google
      </button>
    </div>
  );
}
