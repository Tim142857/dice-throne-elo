"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelDisputeAction,
  resolveDisputeCustomAction,
  resolveDisputeKeepProposalAction,
} from "@/app/actions/admin-disputes";
import type { ActionResult } from "@/lib/actions/result";
import {
  describeMatchOutcomeFromHealth,
  formatMatchFinalHealthScore,
} from "@/domain/matches/final-health";

type HeroOption = { id: string; label: string };
type ProposalOption = {
  id: string;
  versionNumber: number;
  label: string;
  playedAt: string;
  hero1Id: string;
  hero2Id: string;
  winnerProfileId: string | null;
  player1RemainingHealth: number;
  player2RemainingHealth: number;
  notes: string | null;
};

type DisputeResolvePanelProps = {
  matchId: string;
  player1Id: string;
  player2Id: string;
  player1Pseudo: string;
  player2Pseudo: string;
  proposals: ProposalOption[];
  heroes: HeroOption[];
  currentProposalId: string;
};

export function DisputeResolvePanel({
  matchId,
  player1Id,
  player2Id,
  player1Pseudo,
  player2Pseudo,
  proposals,
  heroes,
  currentProposalId,
}: DisputeResolvePanelProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const current = proposals.find((pItem) => pItem.id === currentProposalId) ?? proposals[0];
  const [player1Health, setPlayer1Health] = useState(current?.player1RemainingHealth ?? 15);
  const [player2Health, setPlayer2Health] = useState(current?.player2RemainingHealth ?? 0);

  const customOutcome = describeMatchOutcomeFromHealth({
    player1Id,
    player2Id,
    player1Label: player1Pseudo,
    player2Label: player2Pseudo,
    player1RemainingHealth: player1Health,
    player2RemainingHealth: player2Health,
  });

  function runAction(
    pAction: (pFormData: FormData) => Promise<ActionResult>,
    pFormData: FormData,
  ) {
    startTransition(async () => {
      setError("");
      setMessage("");
      const result = await pAction(pFormData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(result.message ?? "Décision enregistrée.");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-5 rounded-md border border-zinc-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-medium">Travailler le litige</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Validez une proposition existante, saisissez une décision corrigée, ou annulez le match.
        </p>
      </div>

      <form
        className="flex flex-col gap-3 border-b border-zinc-100 pb-5"
        onSubmit={(pEvent) => {
          pEvent.preventDefault();
          runAction(resolveDisputeKeepProposalAction, new FormData(pEvent.currentTarget));
        }}
      >
        <input type="hidden" name="matchId" value={matchId} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Proposition à valider</span>
          <select
            name="proposalId"
            required
            defaultValue={currentProposalId}
            className="min-h-11 rounded-md border border-zinc-300 px-3 py-2"
          >
            {proposals.map((pProposal) => (
              <option key={pProposal.id} value={pProposal.id}>
                v{pProposal.versionNumber} — {pProposal.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Commentaire (optionnel)</span>
          <input name="reason" className="min-h-11 rounded-md border border-zinc-300 px-3 py-2" />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          Valider cette proposition
        </button>
      </form>

      <form
        className="flex flex-col gap-3 border-b border-zinc-100 pb-5"
        onSubmit={(pEvent) => {
          pEvent.preventDefault();
          runAction(resolveDisputeCustomAction, new FormData(pEvent.currentTarget));
        }}
      >
        <h3 className="text-sm font-medium">Décision corrigée</h3>
        <input type="hidden" name="matchId" value={matchId} />
        <input type="hidden" name="player1Id" value={player1Id} />
        <input type="hidden" name="player2Id" value={player2Id} />
        <label className="flex flex-col gap-1 text-sm">
          <span>Date</span>
          <input
            name="playedAt"
            type="date"
            required
            defaultValue={current?.playedAt}
            max={new Date().toISOString().slice(0, 10)}
            className="min-h-11 rounded-md border border-zinc-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Héros {player1Pseudo}</span>
          <select
            name="hero1Id"
            required
            defaultValue={current?.hero1Id}
            className="min-h-11 rounded-md border border-zinc-300 px-3 py-2"
          >
            {heroes.map((pHero) => (
              <option key={pHero.id} value={pHero.id}>
                {pHero.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Héros {player2Pseudo}</span>
          <select
            name="hero2Id"
            required
            defaultValue={current?.hero2Id}
            className="min-h-11 rounded-md border border-zinc-300 px-3 py-2"
          >
            {heroes.map((pHero) => (
              <option key={pHero.id} value={pHero.id}>
                {pHero.label}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>PV restants — {player1Pseudo}</span>
            <input
              name="player1RemainingHealth"
              type="number"
              min={0}
              max={50}
              required
              value={player1Health}
              onChange={(pEvent) => setPlayer1Health(Number(pEvent.target.value))}
              className="min-h-11 rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span>PV restants — {player2Pseudo}</span>
            <input
              name="player2RemainingHealth"
              type="number"
              min={0}
              max={50}
              required
              value={player2Health}
              onChange={(pEvent) => setPlayer2Health(Number(pEvent.target.value))}
              className="min-h-11 rounded-md border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
          Résultat calculé : <span className="font-medium">{customOutcome}</span>
        </p>
        <p className="text-xs text-zinc-500">
          Déduit automatiquement des PV (égaux = nul, y compris 0-0).
        </p>
        <label className="flex flex-col gap-1 text-sm">
          <span>Notes (optionnel)</span>
          <textarea
            name="notes"
            rows={2}
            defaultValue={current?.notes ?? ""}
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Commentaire admin (optionnel)</span>
          <input name="reason" className="min-h-11 rounded-md border border-zinc-300 px-3 py-2" />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
        >
          Enregistrer et valider
        </button>
      </form>

      <form
        className="flex flex-col gap-3"
        onSubmit={(pEvent) => {
          pEvent.preventDefault();
          if (!window.confirm("Annuler définitivement ce match en litige ?")) {
            return;
          }
          runAction(cancelDisputeAction, new FormData(pEvent.currentTarget));
        }}
      >
        <input type="hidden" name="matchId" value={matchId} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Motif d’annulation (optionnel)</span>
          <input name="reason" className="min-h-11 rounded-md border border-zinc-300 px-3 py-2" />
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-md border border-red-300 bg-red-50 px-4 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-60"
        >
          Annuler définitivement
        </button>
      </form>

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
