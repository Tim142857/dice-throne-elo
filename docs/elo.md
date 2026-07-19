# Logique Elo

## Formules

Probabilité de victoire du joueur A :

```text
expectedA = 1 / (1 + 10 ^ ((ratingB - ratingA) / 400))
```

Nouveau rating :

```text
newRatingA = ratingA + K * (scoreA - expectedA)
```

- `scoreA = 1` en cas de victoire, `0` en cas de défaite
- la variation de B est **exactement** l’opposé de celle de A (avant arrondi d’affichage)

## Coefficients

| Classement | Elo initial | K |
| --- | --- | --- |
| Général (joueur) | 1000 | 32 |
| Joueur–héros | 1000 | 40 |

Les points de vie restants n’influencent jamais l’Elo.

## Précision

- Calculs et stockage en décimales (`numeric(12,6)` en base)
- Aucun arrondi intermédiaire
- Affichage uniquement : entier le plus proche (`roundRatingForDisplay`)

## Ordre officiel

- Matchs live : ordre de `validatedAt`
- Import historique : date de match puis ordre de ligne source

## Code

Implémentation pure (sans I/O) : `src/domain/elo/calculate.ts`

Fonctions principales :

- `computeExpectedScore`
- `applyGeneralElo` / `applyPlayerHeroElo`
- `roundRatingForDisplay`
- `nextWinStreak` / `nextBestWinStreak`

## Recalcul complet

- Domaine : `src/domain/elo/recompute.ts` (`recomputeRatingsFromMatches`)
- Persistance atomique : RPC SQL `replace_season_ratings` (verrou `pg_advisory_xact_lock`)
- Orchestration : `src/lib/matches/recompute-ratings.ts`
- UI admin : `/admin/maintenance`

Déclencheurs obligatoires :

- import historique
- annulation admin d’un match validé
- correction admin exceptionnelle
- demande manuelle admin
