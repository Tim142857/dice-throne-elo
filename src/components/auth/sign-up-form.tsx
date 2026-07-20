"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { PasswordInput } from "@/components/auth/password-input";
import { signUpAction } from "@/app/actions/auth";

export function SignUpForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
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
          <span className="font-medium text-violet-900">Pseudo public</span>
          <input
            name="pseudo"
            type="text"
            required
            minLength={3}
            maxLength={24}
            autoComplete="username"
            className="brand-input"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-violet-900">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="brand-input"
          />
        </label>
        <PasswordInput
          name="password"
          label="Mot de passe"
          required
          autoComplete="new-password"
          minLength={8}
        />
        <PasswordInput
          name="passwordConfirm"
          label="Confirmer le mot de passe"
          required
          autoComplete="new-password"
          minLength={8}
        />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-violet-900">Message à l’administrateur (optionnel)</span>
          <textarea
            name="presentationMessage"
            rows={3}
            maxLength={500}
            className="brand-input"
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
          className="btn-primary w-full disabled:opacity-60"
        >
          {isPending ? "Création…" : "Créer mon compte"}
        </button>
    </form>
  );
}
