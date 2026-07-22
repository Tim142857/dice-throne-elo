"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelDisputeAction,
  validatePendingMatchAction,
} from "@/app/actions/admin-disputes";
import type { ActionResult } from "@/lib/actions/result";

type AdminPendingMatchActionsProps = {
  matchId: string;
  status: string;
};

export function AdminPendingMatchActions({ matchId, status }: AdminPendingMatchActionsProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const canModerate =
    status === "pendingOpponent" || status === "pendingCreatorConfirmation";

  if (!canModerate) {
    return null;
  }

  function runAction(
    pAction: (pFormData: FormData) => Promise<ActionResult>,
    pConfirm: string,
  ) {
    if (!window.confirm(pConfirm)) {
      return;
    }
    const formData = new FormData();
    formData.set("matchId", matchId);
    if (reason.trim()) {
      formData.set("reason", reason.trim());
    }
    startTransition(async () => {
      setError("");
      setMessage("");
      const result = await pAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Action effectuée.");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-md border border-amber-200 bg-amber-50 p-5">
      <div>
        <h2 className="text-lg font-medium text-amber-950">Actions administrateur</h2>
        <p className="mt-1 text-sm text-amber-900/80">
          Vous pouvez forcer la validation de la proposition actuelle, ou annuler le match s’il
          est bloqué / erroné.
        </p>
      </div>

      <label className="flex flex-col gap-1 text-sm text-amber-950">
        Motif (optionnel)
        <input
          value={reason}
          onChange={(pEvent) => setReason(pEvent.target.value)}
          className="rounded-md border border-amber-300 bg-white px-3 py-2"
          placeholder="Ex. validation demandée par les deux joueurs"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
          onClick={() =>
            runAction(
              validatePendingMatchAction,
              "Valider administrativement ce match ? L’Elo sera mis à jour immédiatement.",
            )
          }
        >
          Valider le match
        </button>
        <button
          type="button"
          disabled={isPending}
          className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
          onClick={() =>
            runAction(cancelDisputeAction, "Annuler définitivement ce match en attente ?")
          }
        >
          Annuler le match
        </button>
      </div>

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
    </section>
  );
}
