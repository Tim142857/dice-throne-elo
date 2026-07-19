"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createHeroAction } from "@/app/actions/admin-heroes";

export function CreateHeroForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-5"
      onSubmit={(pEvent) => {
        pEvent.preventDefault();
        const formData = new FormData(pEvent.currentTarget);
        startTransition(async () => {
          setError("");
          setMessage("");
          const result = await createHeroAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setMessage(result.message ?? "Créé.");
          pEvent.currentTarget.reset();
          router.refresh();
        });
      }}
    >
      <h2 className="text-lg font-medium">Ajouter un héros</h2>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-zinc-800">Nom</span>
        <input
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={48}
          className="rounded-md border border-zinc-300 px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" value="true" defaultChecked />
        <span>Actif (sélectionnable pour les nouveaux matchs)</span>
      </label>
      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {isPending ? "Création…" : "Créer"}
      </button>
    </form>
  );
}
