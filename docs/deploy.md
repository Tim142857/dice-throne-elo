# Déploiement Vercel + Supabase

Checklist de mise en production (CDC étape 14).

## 1. Supabase

1. Créer un projet (offre gratuite).
2. Appliquer les migrations :

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

3. Auth → activer Email et Google si besoin.
4. Auth → URL de redirection : `https://<votre-domaine>/auth/callback` (+ `http://localhost:3000/auth/callback` en local).
5. Noter l’URL projet, la clé `anon` et la clé `service_role`.

## 2. Variables Vercel

Dans le projet Vercel → Settings → Environment Variables :

| Variable | Notes |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** serveur uniquement |
| `ADMIN_EMAIL` | Email du premier admin (bootstrap) |
| `NEXT_PUBLIC_APP_URL` | URL canonique (ex. `https://dice-throne-elo.vercel.app`) |

## 3. Déployer

```bash
npx vercel
# ou connecter le dépôt GitHub et laisser le CI Vercel builder
```

Le fichier `vercel.json` fixe le framework Next.js. Build commande par défaut : `next build`.

## 4. Après le premier deploy

1. Se connecter avec `ADMIN_EMAIL` → le profil est promu admin au premier chargement authentifié.
2. Importer l’historique si besoin (en local avec service role) :

```bash
npm run import:matches -- data/demo/historical-matches.demo.csv
```

3. Vérifier les pages publiques `/classements`, `/heros`, `/matchs`.
4. Lancer `npm run test:e2e` contre l’URL de preview si souhaité (`PLAYWRIGHT_BASE_URL=...`).

## 5. Sécurité

- Ne jamais exposer `SUPABASE_SERVICE_ROLE_KEY` dans un bundle client.
- Les écritures matchs / Elo passent par actions serveur + service role ; le client anon ne peut pas écrire ces tables (RLS).
- Restreindre les redirects OAuth aux domaines connus.
