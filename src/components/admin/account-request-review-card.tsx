"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  approveAccountRequestAction,
  rejectAccountRequestAction,
} from "@/app/actions/admin-accounts";

type PreloadedOption = {
  id: string;
  pseudo: string;
};

type AccountRequestReviewCardProps = {
  requestId: string;
  requestedPseudo: string;
  presentationMessage: string | null;
  suggestedPreloadedId: string | null;
  preloadedOptions: PreloadedOption[];
  createdAt: string;
};

export function AccountRequestReviewCard({
  requestId,
  requestedPseudo,
  presentationMessage,
  suggestedPreloadedId,
  preloadedOptions,
  createdAt,
}: AccountRequestReviewCardProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <article className="rounded-md border border-zinc-200 bg-white p-5">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium text-zinc-950">{requestedPseudo}</h2>
        <p className="text-xs text-zinc-500">
          Demande du {new Date(createdAt).toLocaleString("fr-FR")}
        </p>
      </div>
      {presentationMessage ? (
        <p className="mt-3 text-sm text-zinc-700">{presentationMessage}</p>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">Aucun message de présentation.</p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        <form
          className="flex flex-col gap-3"
          onSubmit={(pEvent) => {
            pEvent.preventDefault();
            const formData = new FormData(pEvent.currentTarget);
            startTransition(async () => {
              setError("");
              setMessage("");
              const result = await approveAccountRequestAction(formData);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setMessage(result.message ?? "Approuvé.");
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="requestId" value={requestId} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800">Relier à un profil historique (optionnel)</span>
            <select
              name="selectedPreloadedProfileId"
              defaultValue={suggestedPreloadedId ?? ""}
              className="rounded-md border border-zinc-300 px-3 py-2"
            >
              <option value="">Créer / activer le profil demandé</option>
              {preloadedOptions.map((pOption) => (
                <option key={pOption.id} value={pOption.id}>
                  {pOption.pseudo}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
          >
            Approuver
          </button>
        </form>

        <form
          className="flex flex-col gap-3"
          onSubmit={(pEvent) => {
            pEvent.preventDefault();
            const formData = new FormData(pEvent.currentTarget);
            startTransition(async () => {
              setError("");
              setMessage("");
              const result = await rejectAccountRequestAction(formData);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setMessage(result.message ?? "Refusé.");
              router.refresh();
            });
          }}
        >
          <input type="hidden" name="requestId" value={requestId} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-zinc-800">Motif de refus (optionnel)</span>
            <input
              name="rejectionReason"
              type="text"
              maxLength={1000}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
          >
            Refuser
          </button>
        </form>
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
    </article>
  );
}
