# Guide de déploiement en production

Ce guide décrit comment mettre **Dice Throne Elo** en production avec **Supabase** (PostgreSQL + Auth) et **Vercel** (hébergement Next.js). Les offres gratuites des deux services suffisent pour la V1.

---

## Sommaire

1. [Prérequis](#1-prérequis)
2. [Supabase — créer le projet](#2-supabase--créer-le-projet)
3. [Supabase — Auth](#3-supabase--auth)
4. [Variables d’environnement](#4-variables-denvironnement)
5. [Vercel — déploiement](#5-vercel--déploiement)
6. [Après le premier déploiement](#6-après-le-premier-déploiement)
7. [Exploitation au quotidien](#7-exploitation-au-quotidien)
8. [Sécurité — checklist prod](#8-sécurité--checklist-prod)
9. [Dépannage](#9-dépannage)
10. [Résumé — ordre des opérations](#10-résumé--ordre-des-opérations)

---

## 1. Prérequis

| Élément | Détail |
| --- | --- |
| Node.js | **20.19+** recommandé (22 LTS idéal pour Vercel) |
| Comptes | [Supabase](https://supabase.com), [Vercel](https://vercel.com) |
| Git | Dépôt versionné (clone ou fork du projet) |
| Domaine | Optionnel ; Vercel fournit une URL `*.vercel.app` |

Installation locale pour les tests et l’import historique :

```bash
npm install
cp .env.example .env.local
```

---

## 2. Supabase — créer le projet

### 2.1 Nouveau projet

1. Supabase → **New project**
2. Choisir une région proche des joueurs (ex. **Frankfurt** pour l’Europe)
3. Noter le **Project ref** (ex. `abcdefghijklmnop`) dans **Settings → General**

### 2.2 Appliquer le schéma SQL

Les migrations sont versionnées dans `supabase/migrations/`.

**Option A — CLI (recommandée)**

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase db push
```

**Option B — SQL Editor**

Exécuter chaque fichier de `supabase/migrations/` **dans l’ordre chronologique** du nom de fichier.

#### Contenu des migrations

| Fichier | Rôle |
| --- | --- |
| `20260719100000_extensions_and_enums.sql` | Extensions, helpers SQL, enums |
| `20260719100100_core_tables.sql` | `seasons`, `profiles`, `account_requests`, `heroes` |
| `20260719100200_match_tables.sql` | `matches`, `match_proposals`, `match_actions` |
| `20260719100300_ratings_notifications_audit.sql` | Elo, notifications, audit |
| `20260719100400_rls_policies.sql` | Row Level Security |
| `20260719100500_seed_season_players_heroes.sql` | Saison globale, 7 joueurs, 44 héros |
| `20260719100600_account_request_pending_pseudo_unique.sql` | Unicité pseudos en attente |
| `20260719100700_replace_season_ratings.sql` | RPC recalcul Elo atomique |
| `20260719100800_add_playable_heroes.sql` | 10 héros jouables supplémentaires |

#### Données initiales (seeds)

- Saison : `Saison globale`
- Joueurs préchargés : Ewenn, Lomig, Florine, Flo, Adrien, Tim, Anaelle
- Elo initial : **1000** pour chaque joueur seedé

Détails : `docs/database.md`.

### 2.3 Récupérer les clés API

**Settings → API** :

| Clé Supabase | Variable d’environnement |
| --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| anon public | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role | `SUPABASE_SERVICE_ROLE_KEY` |

La clé `service_role` contourne le RLS : **ne jamais l’exposer au navigateur ni la committer**.

---

## 3. Supabase — Auth

### 3.1 Email / mot de passe

**Authentication → Providers → Email**

- Activer **Confirm email** (recommandé en production)

### 3.2 URLs de redirection

**Authentication → URL Configuration**

| Champ | Valeur |
| --- | --- |
| **Site URL** | `https://<votre-domaine-prod>` |
| **Redirect URLs** | `https://<votre-domaine-prod>/auth/callback` |
| | `http://localhost:3000/auth/callback` (développement local) |

Pour les previews Vercel, ajouter l’URL de preview si nécessaire, par exemple :

`https://<nom-projet>-<hash>.vercel.app/auth/callback`

### 3.3 Google OAuth (optionnel)

1. [Google Cloud Console](https://console.cloud.google.com) → créer des identifiants OAuth 2.0
2. **Authorized redirect URI** :  
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. Coller **Client ID** et **Client Secret** dans Supabase → **Authentication → Providers → Google**

Flux côté app : bouton Google → callback `/auth/callback` → provisioning compte.  
Détails : `docs/auth.md`.

---

## 4. Variables d’environnement

### 4.1 Fichier local

Copier `.env.example` vers `.env.local` :

```bash
cp .env.example .env.local
```

Renseigner :

```text
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_EMAIL=ton-email-admin@example.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

En production, `NEXT_PUBLIC_APP_URL` doit être l’**URL finale** de l’app (pas `localhost`).

### 4.2 Variables Vercel

**Projet Vercel → Settings → Environment Variables**

Ajouter les **5 variables** pour l’environnement **Production** (et **Preview** si vous testez sur des branches) :

| Variable | Rôle |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique (client navigateur) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret serveur (actions admin, Elo, import) |
| `ADMIN_EMAIL` | Email du compte promu administrateur au premier login |
| `NEXT_PUBLIC_APP_URL` | URL canonique prod (ex. `https://dice-throne-elo.vercel.app`) |

| Type | Exposé au client ? |
| --- | --- |
| `NEXT_PUBLIC_*` | Oui |
| `SUPABASE_SERVICE_ROLE_KEY` | **Non** — serveur uniquement |
| `ADMIN_EMAIL` | Non (lu côté serveur au bootstrap) |

---

## 5. Vercel — déploiement

Le fichier `vercel.json` configure le framework Next.js et la commande de build (`next build`).

### 5.1 Via GitHub (recommandé)

1. Pousser le dépôt sur GitHub :

```bash
git remote add origin https://github.com/<user>/DiceThroneElo.git
git push -u origin master
```

2. Vercel → **Add New Project** → importer le dépôt
3. Framework : **Next.js** (détection automatique)
4. Configurer les variables d’environnement (section 4.2)
5. **Deploy**

Chaque push sur la branche principale redéploie automatiquement.

### 5.2 Via CLI

```bash
npm i -g vercel
vercel login
vercel
# Configurer les variables dans le dashboard Vercel
vercel --prod
```

### 5.3 Node.js sur Vercel

Le projet requiert Node **≥ 20.9**. Dans Vercel → **Settings → General → Node.js Version**, choisir **20.x** ou **22.x**.

---

## 6. Après le premier déploiement

### 6.1 Bootstrap administrateur

1. Vérifier que `ADMIN_EMAIL` sur Vercel correspond à l’email que vous allez utiliser
2. Sur l’app en prod : **Inscription** ou **Connexion** avec cet email
3. Confirmer l’email (lien envoyé par Supabase)
4. Se reconnecter → au premier chargement authentifié, le compte est promu **admin** + **active**
5. Ouvrir `/admin`

Aucune route publique ne permet de s’auto-attribuer le rôle admin.

### 6.2 Vérifications manuelles

| Page | Attendu |
| --- | --- |
| `/` | Accueil, lien classements |
| `/classements` | Joueurs seedés à 1000 Elo |
| `/heros` | 44 héros |
| `/matchs` | Vide ou matchs validés |
| `/connexion`, `/inscription` | Formulaires fonctionnels |
| `/admin` | Accessible uniquement par l’admin |

### 6.3 Import des matchs historiques (optionnel)

À exécuter **en local** avec `.env.local` pointant vers le projet Supabase de prod :

```bash
npm run import:matches -- data/demo/historical-matches.demo.csv
```

Pour un export réel : placer le fichier dans `data/imports/` (non versionné) puis :

```bash
npm run import:matches -- data/imports/mon-export.xlsx
```

Le script est idempotent (clé `import_source_key`) et lance un recalcul Elo complet.  
Détails : `docs/import.md`.

### 6.4 Tests automatisés (optionnel)

Contre l’URL de production ou de preview :

```bash
PLAYWRIGHT_BASE_URL=https://ton-app.vercel.app npm run test:e2e
```

Scénarios authentifiés complets : voir `docs/testing.md` (`E2E_AUTH=1` + comptes de test).

---

## 7. Exploitation au quotidien

### Pages administrateur

| Route | Usage |
| --- | --- |
| `/admin` | Tableau de bord |
| `/admin/inscriptions` | Approuver / refuser / lier un profil historique |
| `/admin/utilisateurs` | Suspendre, réactiver, corriger un pseudo |
| `/admin/heros` | Ajouter, renommer, activer / désactiver des héros |
| `/admin/litiges` | Trancher les matchs en désaccord |
| `/admin/matchs` | Consulter les matchs récents |
| `/admin/maintenance` | Recalcul Elo, vérification cohérence, annulation admin |
| `/admin/audit` | Journal des actions sensibles |

### Parcours joueur

| Route | Usage |
| --- | --- |
| `/matchs/nouveau` | Déclarer un match (compte **active**) |
| `/mes-matchs` | Valider, refuser, corriger |
| `/notifications` | Centre de notifications |
| `/tableau-de-bord` | Statut du compte |

Workflow détaillé : `docs/match-workflow.md`.

---

## 8. Sécurité — checklist prod

- [ ] `SUPABASE_SERVICE_ROLE_KEY` uniquement sur Vercel (variables serveur), jamais dans le code client
- [ ] `.env.local` et secrets **non commités** (voir `.gitignore`)
- [ ] Redirect URLs OAuth limitées au domaine prod + localhost
- [ ] Confirmation email activée en production
- [ ] `ADMIN_EMAIL` = adresse personnelle de confiance
- [ ] RLS actif : pas d’écriture client sur `matches`, `player_ratings`, etc. (voir `docs/database.md`)
- [ ] Exports de matchs réels dans `data/imports/` (ignorés par Git)

---

## 9. Dépannage

| Problème | Cause probable | Solution |
| --- | --- | --- |
| Pages vides ou erreur Supabase | Variables manquantes sur Vercel | Vérifier les 5 variables, puis **Redeploy** |
| OAuth Google échoue | Redirect URL incorrecte | Aligner Supabase + Google Cloud sur `/auth/callback` |
| « Accès administrateur requis » | Mauvais email ou email non confirmé | Se connecter avec `ADMIN_EMAIL`, confirmer l’email |
| Build Vercel échoue | Version Node trop ancienne | Passer Node à 20.x ou 22.x dans les settings Vercel |
| Import historique échoue | Migrations non appliquées | `npx supabase db push` |
| Classements vides après import | Recalcul non exécuté | Relancer l’import ou recalcul via `/admin/maintenance` |
| E2E timeout en local | Mauvaise URL de base | Utiliser `http://localhost:3000` (pas `127.0.0.1`) dans Playwright |

---

## 10. Résumé — ordre des opérations

```text
1.  Créer le projet Supabase
2.  npx supabase link && npx supabase db push
3.  Configurer Auth (email, redirects, Google si besoin)
4.  Noter URL + clés API
5.  Pousser le code sur GitHub
6.  Créer le projet Vercel + variables d’environnement
7.  Déployer (git push ou vercel --prod)
8.  S’inscrire / se connecter avec ADMIN_EMAIL
9.  Vérifier /admin et les pages publiques
10. (Optionnel) Importer l’historique CSV/XLSX
11. (Optionnel) Smoke test E2E sur l’URL prod
```

---

## Documentation associée

- Auth et bootstrap admin : `docs/auth.md`
- Schéma SQL et RLS : `docs/database.md`
- Import historique : `docs/import.md`
- Tests : `docs/testing.md`
- Workflow matchs et litiges : `docs/match-workflow.md`
- Logique Elo : `docs/elo.md`
