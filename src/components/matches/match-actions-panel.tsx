"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  acceptCorrectionAction,
  cancelMatchAction,
  proposeCorrectionAction,
  rejectCorrectionAction,
  rejectMatchAction,
  validateMatchAction,
} from "@/app/actions/matches";
import { describeMatchOutcomeFromHealth } from "@/domain/matches/final-health";
import type { ActionResult } from "@/lib/actions/result";

type HeroOption = { id: string; label: string };

type MatchActionsPanelProps = {
  matchId: string;
  status: string;
  isCreator: boolean;
  isOpponent: boolean;
  proposal: {
    playedAt: string;
    player1Id: string;
    player2Id: string;
    hero1Id: string;
    hero2Id: string;
    winnerProfileId: string | null;
    player1RemainingHealth: number;
    player2RemainingHealth: number;
    notes: string | null;
  };
  heroes: HeroOption[];
  player1Pseudo: string;
  player2Pseudo: string;
};

export function MatchActionsPanel({
  matchId,
  status,
  isCreator,
  isOpponent,
  proposal,
  heroes,
  player1Pseudo,
  player2Pseudo,
}: MatchActionsPanelProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showCorrection, setShowCorrection] = useState(false);
  const [player1Health, setPlayer1Health] = useState(proposal.player1RemainingHealth);
  const [player2Health, setPlayer2Health] = useState(proposal.player2RemainingHealth);

  const correctionOutcome = describeMatchOutcomeFromHealth({
    player1Id: proposal.player1Id,
    player2Id: proposal.player2Id,
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
      setMessage(result.message ?? "Action effectuée.");
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-md border border-zinc-200 bg-white p-5">
      <h2 className="text-lg font-medium">Actions</h2>

      {isOpponent && status === "pendingOpponent" ? (
        <div className="flex flex-col gap-3">
          <form
            onSubmit={(pEvent) => {
              pEvent.preventDefault();
              runAction(validateMatchAction, new FormData(pEvent.currentTarget));
            }}
          >
            <input type="hidden" name="matchId" value={matchId} />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              Valider le résultat
            </button>
          </form>

          <form
            className="flex flex-col gap-2"
            onSubmit={(pEvent) => {
              pEvent.preventDefault();
              runAction(rejectMatchAction, new FormData(pEvent.currentTarget));
            }}
          >
            <input type="hidden" name="matchId" value={matchId} />
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-zinc-800">Motif du refus</span>
              <input
                name="reason"
                required
                className="min-h-11 rounded-md border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={isPending}
              className="min-h-11 rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
            >
              Refuser
            </button>
          </form>

          <button
            type="button"
            className="inline-flex min-h-11 items-center text-left text-sm font-medium text-zinc-800 hover:underline"
            onClick={() => setShowCorrection((pValue) => !pValue)}
            aria-expanded={showCorrection}
          >
            {showCorrection ? "Masquer la correction" : "Proposer une correction"}
          </button>

          {showCorrection ? (
            <form
              className="flex flex-col gap-3 border-t border-zinc-100 pt-3"
              onSubmit={(pEvent) => {
                pEvent.preventDefault();
                runAction(proposeCorrectionAction, new FormData(pEvent.currentTarget));
              }}
            >
              <input type="hidden" name="matchId" value={matchId} />
              <input type="hidden" name="player1Id" value={proposal.player1Id} />
              <input type="hidden" name="player2Id" value={proposal.player2Id} />
              <label className="flex flex-col gap-1 text-sm">
                <span>Date</span>
                <input
                  name="playedAt"
                  type="date"
                  required
                  defaultValue={proposal.playedAt}
                  max={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-zinc-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span>Héros {player1Pseudo}</span>
                <select
                  name="hero1Id"
                  required
                  defaultValue={proposal.hero1Id}
                  className="rounded-md border border-zinc-300 px-3 py-2"
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
                  defaultValue={proposal.hero2Id}
                  className="rounded-md border border-zinc-300 px-3 py-2"
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
                    className="rounded-md border border-zinc-300 px-3 py-2"
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
                    className="rounded-md border border-zinc-300 px-3 py-2"
                  />
                </label>
              </div>
              <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800">
                Résultat calculé : <span className="font-medium">{correctionOutcome}</span>
              </p>
              <p className="text-xs text-zinc-500">
                Déduit automatiquement des PV (égaux = nul, y compris 0-0).
              </p>
              <label className="flex flex-col gap-1 text-sm">
                <span>Notes (optionnel)</span>
                <textarea
                  name="notes"
                  maxLength={500}
                  rows={2}
                  defaultValue={proposal.notes ?? ""}
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="submit"
                disabled={isPending}
                className="min-h-11 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
              >
                Envoyer la correction
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {isCreator && status === "pendingOpponent" ? (
        <form
          onSubmit={(pEvent) => {
            pEvent.preventDefault();
            if (!window.confirm("Annuler définitivement cette déclaration ?")) {
              return;
            }
            runAction(cancelMatchAction, new FormData(pEvent.currentTarget));
          }}
        >
          <input type="hidden" name="matchId" value={matchId} />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
          >
            Annuler ma déclaration
          </button>
        </form>
      ) : null}

      {isCreator && status === "pendingCreatorConfirmation" ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <form
            onSubmit={(pEvent) => {
              pEvent.preventDefault();
              runAction(acceptCorrectionAction, new FormData(pEvent.currentTarget));
            }}
          >
            <input type="hidden" name="matchId" value={matchId} />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
            >
              Accepter la correction
            </button>
          </form>
          <form
            onSubmit={(pEvent) => {
              pEvent.preventDefault();
              runAction(rejectCorrectionAction, new FormData(pEvent.currentTarget));
            }}
          >
            <input type="hidden" name="matchId" value={matchId} />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-60"
            >
              Refuser → litige
            </button>
          </form>
          <form
            onSubmit={(pEvent) => {
              pEvent.preventDefault();
              if (!window.confirm("Annuler définitivement cette déclaration ?")) {
                return;
              }
              runAction(cancelMatchAction, new FormData(pEvent.currentTarget));
            }}
          >
            <input type="hidden" name="matchId" value={matchId} />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-60"
            >
              Annuler
            </button>
          </form>
        </div>
      ) : null}

      {!isCreator && !isOpponent ? (
        <p className="text-sm text-zinc-600">Aucune action disponible sur ce match.</p>
      ) : null}

      {(isCreator || isOpponent) && status === "disputed" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          Ce match est en litige. Un administrateur doit trancher avant tout effet sur les
          classements.
        </p>
      ) : null}

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
