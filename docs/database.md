# Base de données

Le schéma PostgreSQL est versionné dans `supabase/migrations/`.

## Contenu

| Migration | Rôle |
| --- | --- |
| `20260719100000_extensions_and_enums.sql` | Extensions, helpers SQL, enums |
| `20260719100100_core_tables.sql` | `seasons`, `profiles`, `account_requests`, `heroes` |
| `20260719100200_match_tables.sql` | `matches`, `match_proposals`, `match_actions` |
| `20260719100300_ratings_notifications_audit.sql` | Elo, notifications, audit |
| `20260719100400_rls_policies.sql` | Helpers auth + Row Level Security |
| `20260719100500_seed_season_players_heroes.sql` | Saison globale, 7 joueurs historiques, 34 héros |
| `20260719100600_account_request_pending_pseudo_unique.sql` | Unicité des pseudos sur demandes `pending` |
| `20260719100700_replace_season_ratings.sql` | RPC atomique de recalcul Elo + verrou |

## Appliquer les migrations

### Option A — Supabase CLI (recommandé)

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

### Option B — SQL Editor Supabase

Exécuter les fichiers dans l’ordre chronologique du dossier `supabase/migrations/`.

## Seeds stables

- Saison : `00000000-0000-4000-8000-000000000001` (`Saison globale`)
- Joueurs préchargés : Ewenn, Lomig, Florine, Flo, Adrien, Tim, Anaelle
- Elo initial : `1000` dans `player_ratings` pour chaque joueur seedé

## RLS (principes)

- Lecture publique : profils `preloaded` / `active` / `suspended`, héros, matchs `validated`, Elo
- Compte : chacun lit sa demande d’inscription et ses notifications
- Matchs / propositions / actions / Elo / audit : **aucune écriture client** (service role + actions serveur uniquement)
- Admin : gestion des héros, saisons, profils et demandes via `public.is_admin()`

Les transitions de statut sont toujours validées côté serveur.

## Types TypeScript

Voir `src/types/database.ts` (formes applicatives en camelCase).
Les colonnes SQL restent en `snake_case`.
