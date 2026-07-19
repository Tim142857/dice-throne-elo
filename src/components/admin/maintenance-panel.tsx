"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelValidatedMatchAction,
  recomputeRatingsAction,
  verifyRatingsConsistencyAction,
} from "@/app/actions/admin-maintenance";

type ValidatedMatchOption = {
  id: string;
  label: string;
};

type MaintenancePanelProps = {
  validatedMatches: ValidatedMatchOption[];
};

export function MaintenancePanel({ validatedMatches }: MaintenancePanelProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [details, setDetails] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-md border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium">Recalcul complet</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Reconstruit tous les Elo à partir des seuls matchs validés, dans l’ordre de{" "}
          <code>validatedAt</code>, sous verrou PostgreSQL.
        </p>
        <button
          type="button"
          disabled={isPending}
          className="mt-4 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          onClick={() => {
            startTransition(async () => {
              setError("");
              setMessage("");
              setDetails("");
              const result = await recomputeRatingsAction();
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setMessage(result.message ?? "Recalcul terminé.");
              setDetails(
                `${result.data.validatedMatches} matchs · ${result.data.events} événements · empreinte ${result.data.fingerprint.slice(0, 48)}…`,
              );
              router.refresh();
            });
          }}
        >
          {isPending ? "Recalcul…" : "Lancer le recalcul"}
        </button>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium">Vérifier la cohérence</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Compare les classements stockés au résultat d’un recalcul théorique sans écriture.
        </p>
        <button
          type="button"
          disabled={isPending}
          className="mt-4 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
          onClick={() => {
            startTransition(async () => {
              setError("");
              setMessage("");
              setDetails("");
              const result = await verifyRatingsConsistencyAction();
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setMessage(result.message ?? "Vérification terminée.");
              setDetails(
                result.data.isConsistent
                  ? `OK · ${result.data.validatedMatches} matchs · ${result.data.storedEvents} événements`
                  : "Incohérence détectée — lancez un recalcul.",
              );
            });
          }}
        >
          Vérifier
        </button>
      </section>

      <section className="rounded-md border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-medium">Annuler un match validé</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Passe le match en <code>cancelledByAdmin</code> puis relance automatiquement le recalcul.
        </p>
        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(pEvent) => {
            pEvent.preventDefault();
            if (!window.confirm("Annuler ce match validé et recalculer tous les classements ?")) {
              return;
            }
            const formData = new FormData(pEvent.currentTarget);
            startTransition(async () => {
              setError("");
              setMessage("");
              setDetails("");
              const result = await cancelValidatedMatchAction(formData);
              if (!result.ok) {
                setError(result.error);
                return;
              }
              setMessage(result.message ?? "Match annulé.");
              setDetails(
                `Recalcul : ${result.data.validatedMatches} matchs restants · ${result.data.events} événements`,
              );
              router.refresh();
            });
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Match</span>
            <select
              name="matchId"
              required
              className="rounded-md border border-zinc-300 px-3 py-2"
              disabled={validatedMatches.length === 0}
            >
              {validatedMatches.length === 0 ? (
                <option value="">Aucun match validé</option>
              ) : (
                validatedMatches.map((pMatch) => (
                  <option key={pMatch.id} value={pMatch.id}>
                    {pMatch.label}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Motif (optionnel)</span>
            <input
              name="reason"
              type="text"
              maxLength={1000}
              className="rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={isPending || validatedMatches.length === 0}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
          >
            Annuler et recalculer
          </button>
        </form>
      </section>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}
      {details ? <p className="text-xs text-zinc-500">{details}</p> : null}
    </div>
  );
}
