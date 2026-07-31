"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateAutoValidateMatchesAction } from "@/app/actions/account";

type AutoValidatePreferenceFormProps = {
  initialEnabled: boolean;
};

export function AutoValidatePreferenceForm({ initialEnabled }: AutoValidatePreferenceFormProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showTrustWarning, setShowTrustWarning] = useState(false);
  const [isPending, startTransition] = useTransition();

  function persistPreference(pEnabled: boolean) {
    const formData = new FormData();
    formData.set("autoValidateMatches", pEnabled ? "true" : "false");
    startTransition(async () => {
      setError("");
      setMessage("");
      const result = await updateAutoValidateMatchesAction(formData);
      if (!result.ok) {
        setError(result.error);
        setEnabled(initialEnabled);
        setShowTrustWarning(false);
        return;
      }
      setEnabled(result.data.enabled);
      setShowTrustWarning(false);
      setMessage(result.message ?? "Préférence enregistrée.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-semibold text-zinc-950">Validation des matchs</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Choisissez si les matchs déclarés par vos adversaires doivent attendre votre confirmation,
        ou être pris en compte automatiquement.
      </p>

      <fieldset className="mt-4 flex flex-col gap-3" disabled={isPending}>
        <legend className="sr-only">Mode de validation</legend>
        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 hover:bg-zinc-50">
          <input
            type="radio"
            name="autoValidateMatches"
            className="mt-1"
            checked={!enabled && !showTrustWarning}
            onChange={() => {
              if (!enabled && !showTrustWarning) {
                return;
              }
              if (showTrustWarning) {
                setShowTrustWarning(false);
                return;
              }
              persistPreference(false);
            }}
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900">Validation manuelle</span>
            <span className="mt-0.5 block text-sm text-zinc-600">
              Comme aujourd’hui : vous devez accepter chaque match avant mise à jour de l’Elo.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-md border border-zinc-200 px-3 py-3 hover:bg-zinc-50">
          <input
            type="radio"
            name="autoValidateMatches"
            className="mt-1"
            checked={enabled || showTrustWarning}
            onChange={() => {
              if (enabled || showTrustWarning) {
                return;
              }
              setShowTrustWarning(true);
              setMessage("");
              setError("");
            }}
          />
          <span>
            <span className="block text-sm font-medium text-zinc-900">Validation automatique</span>
            <span className="mt-0.5 block text-sm text-zinc-600">
              Les matchs que vos adversaires déclarent contre vous sont validés immédiatement.
            </span>
          </span>
        </label>
      </fieldset>

      {showTrustWarning ? (
        <div
          className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-950"
          role="alertdialog"
          aria-labelledby="auto-validate-warning-title"
        >
          <p id="auto-validate-warning-title" className="font-medium">
            Attention : décision basée sur la confiance
          </p>
          <p className="mt-1">
            En activant cette option, vous acceptez que n’importe quel adversaire puisse déclarer un
            match à votre place sans votre relecture. Le résultat, les PV et l’Elo seront appliqués
            automatiquement. N’activez ceci que si vous faites confiance aux joueurs du club.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isPending}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
              onClick={() => persistPreference(true)}
            >
              {isPending ? "Enregistrement…" : "Je comprends, activer"}
            </button>
            <button
              type="button"
              disabled={isPending}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
              onClick={() => {
                setShowTrustWarning(false);
                setEnabled(false);
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p
          className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
          role="status"
        >
          {message}
        </p>
      ) : null}
    </section>
  );
}
