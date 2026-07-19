# Import des matchs historiques

Script local idempotent pour charger un export CSV/XLSX dans Supabase, puis recalculer les Elo.

## Prérequis

- Variables `.env.local` renseignées (`SUPABASE_SERVICE_ROLE_KEY`, etc.)
- Migrations appliquées (`npx supabase db push`)

## Format attendu

Colonnes (FR ou EN) :

| Colonne | Alias acceptés |
| --- | --- |
| date | `playedAt`, `date`, `played_at` |
| joueur1 | `player1`, `j1` |
| heros1 | `hero1`, `h1` |
| joueur2 | `player2`, `j2` |
| heros2 | `hero2`, `h2` |
| vainqueur | `winner`, `gagnant` |
| pv | `winnerRemainingHealth`, `hp` |
| notes | `note`, `commentaire` (optionnel) |

Date au format `YYYY-MM-DD`.

## Commande

```bash
npm run import:matches -- data/demo/historical-matches.demo.csv
npm run import:matches -- data/imports/mon-export.xlsx
```

## Comportement

1. Crée/retrouve joueurs historiques (`preloaded`) et héros
2. Valide chaque ligne et rapporte les erreurs
3. Ignore les doublons via `import_source_key`
4. Insère les matchs en `validated` (ordre date + ligne préservé dans `validatedAt`)
5. Lance un recalcul Elo complet
6. Affiche le résumé : lues / importées / ignorées / rejetées

## Données

- Démo versionnée : `data/demo/historical-matches.demo.csv`
- Exports réels : `data/imports/` (**non versionnés**, voir `.gitignore`)
