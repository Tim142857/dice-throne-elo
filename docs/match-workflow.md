# Workflow des matchs

## Statuts

| Statut | Signification |
| --- | --- |
| `pendingOpponent` | Déclaré, en attente de l’adversaire |
| `pendingCreatorConfirmation` | Correction proposée, en attente du déclarant |
| `validated` | Accepté, Elo appliqué, public |
| `rejected` | Refusé par l’adversaire |
| `disputed` | Litige (correction refusée) |
| `cancelled` | Annulé par le déclarant |
| `cancelledByAdmin` | Annulé / tranché par l’admin |

## Règles clés

- Seul un compte `active` déclare / valide / corrige
- Le déclarant doit être participant
- Aucun effet Elo avant `validated`
- Modification = nouvelle version de `match_proposals`
- Doublon probable = même date + joueurs + héros + vainqueur (avertissement non bloquant)
- Transitions contrôlées dans `src/domain/matches/workflow.ts`

## Parcours adversaire

1. Valider → Elo appliqué
2. Refuser (+ motif)
3. Proposer une correction → le déclarant accepte (validation) / refuse (litige) / annule

## Litige (admin)

Sur `/admin/litiges`, l’admin peut :

- valider la proposition initiale ou la correction ;
- saisir une décision corrigée (nouvelle version) puis valider ;
- annuler définitivement le match (`cancelledByAdmin`, sans Elo).

Les participants reçoivent une notification `adminDecision`.

## Notifications

Centre `/notifications` : liste, marquer lu / tout marquer lu. Créées côté serveur sur les événements compte / match.

## Fichiers

- Domaine : `src/domain/matches/workflow.ts`
- Service : `src/lib/matches/match-service.ts`
- Elo à la validation : `src/lib/matches/apply-elo.ts`
- Actions : `src/app/actions/matches.ts`, `src/app/actions/admin-disputes.ts`
- UI : `/matchs/nouveau`, `/mes-matchs`, `/matchs`, `/admin/litiges`, `/notifications`
