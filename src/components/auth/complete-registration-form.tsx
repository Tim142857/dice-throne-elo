"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { completeRegistrationAction } from "@/app/actions/auth";

export function CompleteRegistrationForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(pEvent) => {
        pEvent.preventDefault();
        const formData = new FormData(pEvent.currentTarget);
        startTransition(async () => {
          const result = await completeRegistrationAction(formData);
          if (!result.ok) {
            setError(result.error);
            return;
          }
          router.push("/tableau-de-bord");
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
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
      >
        {isPending ? "Enregistrement…" : "Envoyer la demande"}
      </button>
    </form>
  );
}
