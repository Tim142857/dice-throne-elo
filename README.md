# Dice Throne Elo

Application web publique de classement Elo pour Dice Throne (1 contre 1).

## Stack

- Next.js (App Router) + TypeScript strict
- React + Tailwind CSS
- PostgreSQL / Auth via Supabase
- Zod, Vitest, Playwright
- Déploiement prévu sur Vercel (offre gratuite)

## Prérequis

- Node.js 20.19+ recommandé (22 LTS idéal pour Vercel et les outils récents)
- Compte Supabase (projet gratuit)
- Compte Vercel (déploiement)

## Installation

```bash
npm install
cp .env.example .env.local
```

Renseigner les variables dans `.env.local` (voir section Variables d’environnement).

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000).

## Scripts

| Commande | Description |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run typecheck` | Vérification TypeScript |
| `npm test` | Tests unitaires / intégration (Vitest) |
| `npm run test:e2e` | Tests end-to-end (Playwright) |
| `npm run import:matches -- <fichier>` | Import CSV/XLSX historique |

## Variables d’environnement

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=
NEXT_PUBLIC_APP_URL=
```

Ne jamais committer `SUPABASE_SERVICE_ROLE_KEY`. Ne jamais l’exposer au client.

## Conventions

- TypeScript strict, pas de `any`
- camelCase pour le code ; textes UI en français
- Préfixe `p` pour chaque paramètre de fonction ; préfixe `m` pour les membres de classe
- Noms techniques et commentaires en anglais
- Séparation présentation / domaine / données / validation
- Calculs Elo et mutations sensibles côté serveur uniquement
- Schéma via migrations SQL versionnées dans `supabase/migrations`

## Structure

```text
src/
  app/                 # Routes Next.js (App Router)
  components/          # Composants UI
  domain/              # Logique métier (Elo, matchs, comptes)
  lib/                 # Utilitaires et clients (Supabase, env)
  validation/          # Schémas Zod
  types/               # Types partagés
supabase/
  migrations/          # Migrations SQL versionnées
e2e/                   # Tests Playwright
tests/                 # Tests complémentaires
data/demo/             # CSV démo d’import historique
data/imports/          # Exports locaux (non versionnés)
docs/                  # Conventions, base de données, etc.
scripts/               # CLI locales (import, etc.)
```

## Base de données

Les migrations SQL sont dans `supabase/migrations/`.

```bash
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

Détails : `docs/database.md`.
Auth : `docs/auth.md`.

## Import historique

```bash
npm run import:matches -- data/demo/historical-matches.demo.csv
```

Détails : `docs/import.md`.

## Documentation métier

- Cahier des charges : `Cahier_des_charges_Web_App_Elo_Dice_Throne.md`
- Conventions : `docs/CONVENTIONS.md`
- Schéma SQL / RLS : `docs/database.md`
- Auth / admin : `docs/auth.md`
- Logique Elo : `docs/elo.md`
- Workflow des matchs : `docs/match-workflow.md`
- Import historique : `docs/import.md`
- Tests (unitaires, RLS, E2E) : `docs/testing.md`
- Déploiement Vercel : `docs/deploy.md`

## Déploiement

Voir `docs/deploy.md` (Supabase → variables → Vercel → checklist).

### Checklist mise en prod

1. Créer le projet Supabase et `npx supabase db push`
2. Remplir les variables (local + Vercel), dont `ADMIN_EMAIL`
3. Configurer Auth (email + redirects OAuth)
4. Déployer sur Vercel
5. Se connecter avec l’email admin (bootstrap)
6. Optionnel : `npm run import:matches -- data/demo/historical-matches.demo.csv`

## État du projet

V1 fonctionnelle côté dépôt (CDC **1 → 14**) : auth, matchs, Elo, classements, stats, import, litiges, notifications, tests, docs déploiement.

Prochaine action : configurer Supabase / `.env.local`, puis premier commit Git et déploiement Vercel.
