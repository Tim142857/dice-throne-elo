# Authentification

## Flux email / mot de passe

1. L’utilisateur s’inscrit avec email, mot de passe, pseudo et message optionnel.
2. Supabase Auth envoie un email de confirmation.
3. Après confirmation (callback `/auth/callback`) ou à la première connexion vérifiée, le serveur provisionne :
   - une ligne `account_requests` (`pending`) ;
   - un profil `pendingApproval` **uniquement** si le pseudo est libre ;
   - si le pseudo correspond à un profil `preloaded`, seule la demande est créée (liaison admin plus tard).
4. Un compte en attente peut se connecter, consulter le public et son statut, mais ne peut pas déclarer de match.

## Flux Google

1. OAuth via Supabase (`/auth/callback`).
2. Si aucun pseudo n’est encore défini → `/inscription/finaliser`.
3. Ensuite, même provisioning que ci-dessus.

## Fichiers clés

- Actions : `src/app/actions/auth.ts`
- Provisioning : `src/lib/auth/provision-account.ts`
- Session : `src/lib/auth/session.ts`
- Middleware : `src/middleware.ts`

## Bootstrap administrateur

1. Définir `ADMIN_EMAIL` dans `.env.local` avec l’email du compte admin.
2. Créer / connecter ce compte (email vérifié).
3. Au premier chargement authentifié, `ensureAdminBootstrap` lui attribue le rôle `admin` et le statut `active`.
4. Aucune action publique ne permet de s’auto-promouvoir admin.

## Administration des comptes

- `/admin` : tableau de bord
- `/admin/inscriptions` : approuver / refuser / relier à un profil historique
- `/admin/utilisateurs` : suspendre, réactiver, corriger un pseudo

Les actions sensibles sont journalisées dans `audit_logs` et notifient le joueur concerné.

## Configuration Supabase requise

- Auth → Email confirmations activées
- Auth → URL de redirection : `http://localhost:3000/auth/callback` (+ URL prod)
- Provider Google activé (client ID / secret)
- Variables `.env.local` renseignées (`SUPABASE_SERVICE_ROLE_KEY` et `ADMIN_EMAIL` indispensables)
