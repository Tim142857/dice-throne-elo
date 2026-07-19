# Tests

## Unitaires (Vitest)

```bash
npm test
```

Couvrent Elo, workflow matchs, validation, agrégats stats, parsing d’import, etc.

## Intégration RLS

Deux couches :

1. **Statique** (`tests/integration/rls-policies.static.test.ts`) — contrat sur le SQL des politiques (toujours exécuté).
2. **Live** (`tests/integration/rls.live.test.ts`) — client anon vs service role contre le projet Supabase.

Les tests live s’exécutent seulement si `.env.local` contient les variables serveur (`SUPABASE_SERVICE_ROLE_KEY`, etc.). Sinon ils sont **skip**.

```bash
npm test
```

## End-to-end (Playwright)

### Public / gardes (sans compte)

```bash
npx playwright install chromium
npm run test:e2e
```

Scénarios inclus :

- pages publiques (accueil, classements, héros, matchs, inscription, connexion) ;
- redirections vers `/connexion` pour `/admin`, `/matchs/nouveau`, `/mes-matchs`.

### Authentifiés (optionnels)

Activer avec un projet réel et des comptes de test :

```bash
# .env.local (ou shell)
E2E_AUTH=1
E2E_SIGNUP_EMAIL=...
E2E_SIGNUP_PASSWORD=...
E2E_SIGNUP_PSEUDO=E2ETest
E2E_PLAYER_EMAIL=...   # compte active
E2E_PLAYER_PASSWORD=...
E2E_ADMIN_EMAIL=...    # doit correspondre à ADMIN_EMAIL ou rôle admin
E2E_ADMIN_PASSWORD=...
```

```bash
npm run test:e2e
```

Sans `E2E_AUTH=1`, les scénarios authentifiés sont skippés (CDC §23 restants à valider manuellement ou avec ces variables).

## Prérequis app

Pour un E2E complet avec données :

1. Remplir `.env.local` (voir `.env.example`)
2. Appliquer les migrations (`npx supabase db push`)
3. Lancer `npm run test:e2e` (démarre `npm run dev` automatiquement)
