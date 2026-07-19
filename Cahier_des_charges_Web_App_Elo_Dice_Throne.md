# Cahier des charges — Web App Elo Dice Throne

## 1. Objet du projet

Créer une application web publique remplaçant le fichier Excel de classement Elo Dice Throne.

L’application doit permettre à des joueurs de créer un compte, déclarer leurs matchs en 1 contre 1, faire valider les résultats par leur adversaire et consulter différents classements et statistiques publics.

Un match ne doit jamais modifier les classements avant d’avoir été accepté par les deux joueurs ou exceptionnellement validé par l’administrateur à la suite d’un litige.

L’application doit être déployable gratuitement sur Vercel et utiliser une infrastructure adaptée aux offres gratuites.

## 2. Périmètre de la V1

### Inclus

- inscription publique ;
- connexion par email et mot de passe ;
- connexion avec Google ;
- vérification de l’adresse email ;
- validation manuelle des nouveaux comptes par un administrateur unique ;
- pseudo public unique ;
- profils et classements consultables sans connexion ;
- déclaration d’un match en 1 contre 1 ;
- validation, refus ou proposition de correction par l’adversaire ;
- gestion des litiges ;
- Elo général par joueur ;
- Elo par combinaison joueur–héros ;
- historique des matchs et des variations Elo ;
- statistiques des joueurs, héros et confrontations ;
- administration des comptes, héros, matchs et litiges ;
- préchargement des joueurs, héros et matchs historiques ;
- architecture préparée pour de futures saisons, sans interface de gestion des saisons en V1 ;
- un seul classement mondial commun à tous les utilisateurs.

### Hors périmètre de la V1

- matchs à plus de deux joueurs ;
- matchs en équipes ;
- groupes ou ligues privées ;
- messagerie instantanée ;
- application mobile native ;
- notifications push ;
- validation automatique d’un match après un délai ;
- influence des points de vie restants sur le calcul Elo ;
- création libre de héros par les utilisateurs.

## 3. Stack technique imposée

- **Framework :** Next.js dans une version stable récente, avec App Router ;
- **Langage :** TypeScript en mode strict ;
- **Interface :** React et Tailwind CSS ;
- **Base de données :** PostgreSQL via Supabase ;
- **Authentification :** Supabase Auth ;
- **Hébergement :** Vercel ;
- **Validation des données :** Zod ;
- **Tests unitaires :** Vitest ;
- **Tests end-to-end :** Playwright ;
- **Gestion des migrations :** migrations SQL Supabase versionnées dans le dépôt ;
- **Qualité :** ESLint et Prettier.

L’application doit fonctionner dans les limites des offres gratuites de Vercel et Supabase. Aucune fonctionnalité essentielle ne doit dépendre d’un cron payant ou d’un service tiers payant.

## 4. Conventions de développement

- Utiliser TypeScript strictement et éviter `any`.
- Utiliser le camelCase pour les fonctions, variables et propriétés TypeScript.
- Préfixer chaque paramètre de fonction par `p`.
- Préfixer chaque membre de classe par `m` si des classes sont utilisées.
- Écrire les noms de fonctions, variables, types techniques et commentaires de code en anglais.
- Afficher tous les textes de l’interface en français.
- Séparer clairement présentation, logique métier, accès aux données et validation.
- Les calculs Elo et mutations sensibles doivent être effectués côté serveur ou en base, jamais uniquement dans le navigateur.
- Ne jamais exposer la clé Supabase `service_role` au client.
- Toutes les modifications de schéma doivent passer par des migrations versionnées.

## 5. Utilisateurs et inscription

### 5.1 Visiteur non connecté

Un visiteur doit pouvoir consulter sans compte :

- la page d’accueil ;
- le classement général ;
- le classement joueur–héros ;
- les statistiques des héros ;
- les profils publics ;
- l’historique des matchs validés ;
- les pages de confrontation entre joueurs ou héros.

Il ne doit jamais voir :

- les adresses email ;
- les demandes d’inscription ;
- les motifs privés de refus ou de litige ;
- les matchs en attente ;
- les données réservées à l’administrateur.

### 5.2 Création d’un compte

L’utilisateur peut s’inscrire :

- avec une adresse email et un mot de passe ;
- avec son compte Google.

Lors de l’inscription, il doit renseigner :

- un pseudo souhaité ;
- éventuellement un court message de présentation destiné à l’administrateur.

Le pseudo doit :

- être unique sans tenir compte des majuscules et minuscules ;
- contenir entre 3 et 24 caractères ;
- accepter les lettres, chiffres, espaces simples, tirets et underscores ;
- être normalisé avant contrôle d’unicité ;
- ne pas pouvoir être modifié librement après validation ;
- pouvoir être corrigé par l’administrateur.

L’adresse email doit être vérifiée avant que la demande puisse être approuvée.

### 5.3 Validation administrative

Après vérification de l’email, le compte passe au statut `pendingApproval`.

Un compte en attente peut :

- se connecter ;
- consulter toutes les pages publiques ;
- consulter l’état de sa demande ;
- se déconnecter.

Il ne peut pas :

- déclarer un match ;
- valider ou corriger un match ;
- modifier les données publiques ;
- accéder à l’administration.

L’administrateur peut :

- approuver la demande ;
- refuser la demande en indiquant éventuellement un motif ;
- lier la demande à un profil historique préchargé ;
- créer un nouveau profil actif si aucun profil historique ne correspond.

La validation d’un compte doit être une action explicite. Aucun compte ne doit être automatiquement approuvé après un délai.

### 5.4 Statuts des comptes et profils

Prévoir au minimum les statuts suivants :

- `preloaded` : profil historique sans compte d’authentification associé ;
- `pendingApproval` : inscription vérifiée en attente de l’administrateur ;
- `active` : compte approuvé ;
- `rejected` : demande refusée ;
- `suspended` : compte temporairement ou définitivement bloqué.

Un compte suspendu conserve son historique et ses statistiques publiques, mais ne peut plus déclarer ni valider de match.

## 6. Administrateur

La V1 possède un seul administrateur.

Le premier compte administrateur doit être créé de manière sécurisée par variable d’environnement, script de bootstrap ou migration contrôlée. Le rôle administrateur ne doit jamais pouvoir être obtenu depuis l’interface publique.

L’administrateur doit disposer d’un tableau de bord lui permettant de :

- approuver ou refuser les nouveaux comptes ;
- relier un compte à un profil historique ;
- suspendre ou réactiver un compte ;
- corriger un pseudo ;
- consulter les matchs en attente et litigieux ;
- trancher un litige ;
- annuler administrativement un match validé ;
- ajouter, modifier, activer ou désactiver un héros ;
- consulter le journal d’audit ;
- relancer manuellement un recalcul complet des classements ;
- vérifier la cohérence des classements.

Toute action administrative sensible doit être enregistrée dans un journal d’audit horodaté.

## 7. Gestion des héros

Seul l’administrateur peut ajouter ou modifier un héros.

Chaque héros possède au minimum :

- un identifiant UUID ;
- un nom unique ;
- un slug unique ;
- un statut actif ou inactif ;
- une date de création ;
- une date de modification.

Un héros inactif reste visible dans les anciens matchs, mais ne peut plus être sélectionné pour un nouveau match.

### Héros à précharger

- Barbare
- Elfe lunaire
- Moine
- Paladin
- Pyromancienne
- Voleur de l’ombre
- Tréant
- Ninja
- As de la gâchette
- Samouraï
- Séraphine
- Reine vampire
- Artificier
- Pirate maudite
- Tacticien
- Chasseresse
- Krampus
- Père Noël
- Black Panther
- Captain Marvel
- Black Widow
- Dr Strange
- Thor
- Loki
- Spiderman
- Scarlet Witch
- Cyclope
- Gambit
- Malicia
- Jean Grey
- Iceberg
- Psylocke
- Tornade
- Wolverine

## 8. Joueurs historiques à précharger

Créer les profils historiques suivants sans compte d’authentification associé :

- Ewenn
- Lomig
- Florine
- Flo
- Adrien
- Tim
- Anaelle

Ces profils possèdent le statut `preloaded`.

Lorsqu’un de ces joueurs s’inscrit, l’administrateur doit pouvoir relier son compte au profil existant afin de conserver ses matchs, son Elo et ses statistiques. Il ne faut pas créer un second profil concurrent portant un pseudo légèrement différent.

## 9. Déclaration d’un match

### 9.1 Conditions

Seul un utilisateur actif peut déclarer un match.

Le déclarant doit obligatoirement être l’un des deux participants. Il ne peut pas enregistrer un match entre deux autres personnes.

L’adversaire doit posséder un profil existant. Pour valider le match depuis son compte, ce profil doit être associé à un compte actif.

### 9.2 Données du match

Le formulaire doit contenir uniquement :

- date du match ;
- joueur 1 ;
- héros du joueur 1 ;
- joueur 2 ;
- héros du joueur 2 ;
- vainqueur ;
- points de vie restants du vainqueur ;
- notes facultatives.

Contraintes :

- les deux joueurs doivent être différents ;
- le déclarant doit être le joueur 1 ou le joueur 2 ;
- le vainqueur doit être l’un des deux joueurs ;
- les deux héros doivent être actifs au moment de la déclaration ;
- les points de vie restants doivent être un entier compris entre 0 et 50 ;
- la date ne peut pas être située dans le futur ;
- les notes doivent avoir une longueur limitée, par exemple 500 caractères ;
- un contrôle doit avertir d’un doublon probable sans bloquer automatiquement un match légitime.

Un doublon probable correspond notamment à deux matchs ayant la même date, les mêmes joueurs, les mêmes héros et le même vainqueur.

### 9.3 Modification avant validation

Le déclarant peut modifier ou annuler sa proposition tant qu’elle n’a pas été validée par l’adversaire.

Toute modification doit :

- créer une nouvelle version de la proposition ;
- conserver la version précédente dans l’audit ;
- remettre le match dans l’état approprié d’attente de validation ;
- ne jamais modifier les classements avant validation finale.

## 10. Workflow de validation d’un match

### 10.1 Déclaration initiale

Après envoi, le match passe au statut `pendingOpponent`.

L’adversaire voit le match dans son tableau de bord et peut :

1. valider le résultat ;
2. refuser le résultat avec un motif ;
3. proposer une correction.

### 10.2 Validation directe

Si l’adversaire valide :

- le match passe au statut `validated` ;
- la date de validation est enregistrée ;
- le match devient public ;
- les classements et statistiques sont recalculés dans une transaction atomique ;
- les variations Elo du match sont enregistrées.

### 10.3 Refus

Si l’adversaire refuse :

- un motif est demandé ;
- le match passe au statut `rejected` ;
- il ne devient pas public dans l’historique officiel ;
- il n’influence aucun classement ;
- le déclarant peut consulter le refus ;
- l’action reste présente dans l’audit.

### 10.4 Proposition de correction

L’adversaire peut proposer une correction portant sur les données du match.

Le match passe au statut `pendingCreatorConfirmation`.

Le déclarant peut ensuite :

- accepter la correction : le match corrigé est validé et pris en compte ;
- refuser la correction : le match passe au statut `disputed` ;
- annuler sa déclaration : le match passe au statut `cancelled`.

La version originale et la version corrigée doivent être conservées.

### 10.5 Litige

Un match litigieux ne doit avoir aucun effet sur les classements.

L’administrateur peut :

- valider la proposition initiale ;
- valider la correction ;
- saisir une décision corrigée ;
- annuler définitivement le match.

La décision administrative, son auteur, sa date et un commentaire éventuel doivent être enregistrés dans l’audit.

### 10.6 Absence de réponse

Un match non traité reste indéfiniment en attente. Il ne doit être ni validé ni annulé automatiquement.

## 11. Statuts des matchs

Prévoir au minimum :

- `pendingOpponent` ;
- `pendingCreatorConfirmation` ;
- `validated` ;
- `rejected` ;
- `disputed` ;
- `cancelled` ;
- `cancelledByAdmin`.

Les transitions doivent être contrôlées côté serveur. Le client ne doit jamais pouvoir définir directement un statut arbitraire.

## 12. Règles Elo

### 12.1 Elo général

- Elo initial : **1 000** ;
- coefficient K : **32**.

La probabilité théorique de victoire du joueur A est :

```text
expectedA = 1 / (1 + 10 ^ ((ratingB - ratingA) / 400))
```

Le nouvel Elo est :

```text
newRatingA = ratingA + kFactor * (scoreA - expectedA)
```

Avec :

- `scoreA = 1` si le joueur A gagne ;
- `scoreA = 0` si le joueur A perd.

La variation du joueur B doit être exactement l’opposé de celle du joueur A avant affichage arrondi.

### 12.2 Elo joueur–héros

- Elo initial de chaque combinaison : **1 000** ;
- coefficient K : **40**.

Le calcul est identique, mais compare les combinaisons joueur–héros utilisées pendant le match.

Exemple : `Tim + Gambit` affronte `Ewenn + Thor`.

### 12.3 Précision

- Stocker les Elo et variations avec une précision décimale suffisante, par exemple `numeric(12,6)`.
- Ne pas arrondir les valeurs utilisées dans les calculs suivants.
- Arrondir uniquement l’affichage à l’entier le plus proche.
- Les points de vie restants n’influencent jamais l’Elo.

### 12.4 Ordre des calculs

Pour les nouveaux matchs, l’ordre officiel est l’ordre de validation, défini par `validatedAt`, et non la date déclarée du match. Cela évite qu’un ancien match déclaré tardivement réécrive silencieusement tout l’historique déjà affiché.

Pour l’import initial, les matchs historiques doivent être ordonnés de manière déterministe par date de match puis par ordre de ligne du fichier source. Leur `validatedAt` d’import doit préserver cet ordre.

### 12.5 Recalcul complet

L’application doit disposer d’une fonction serveur ou PostgreSQL capable de reconstruire tous les classements depuis zéro à partir des seuls matchs validés.

Ce recalcul est obligatoire après :

- l’import initial ;
- l’annulation administrative d’un match validé ;
- la correction administrative exceptionnelle d’un match validé ;
- une demande manuelle de l’administrateur.

Le recalcul doit :

- s’exécuter dans une transaction ;
- utiliser un verrou PostgreSQL afin d’éviter deux recalculs simultanés ;
- supprimer et recréer les instantanés Elo de manière déterministe ;
- restaurer les classements courants ;
- échouer entièrement en cas d’erreur, sans laisser de classement partiellement recalculé.

## 13. Classements publics

### 13.1 Classement général

Afficher :

- rang ;
- pseudo ;
- Elo général ;
- nombre de matchs ;
- victoires ;
- défaites ;
- taux de victoire ;
- série actuelle ;
- nombre d’adversaires différents ;
- date du dernier match validé.

Filtres et tris :

- classement Elo ;
- taux de victoire ;
- nombre de matchs ;
- nombre de victoires ;
- recherche par pseudo.

### 13.2 Classement joueur–héros

Afficher :

- rang ;
- joueur ;
- héros ;
- Elo de la combinaison ;
- matchs ;
- victoires ;
- défaites ;
- taux de victoire ;
- dernière utilisation.

Une combinaison ne doit apparaître dans le classement officiel qu’après au moins un match validé.

Filtres :

- joueur ;
- héros ;
- nombre minimal de matchs ;
- recherche textuelle.

### 13.3 Égalités

Deux entités ayant exactement le même Elo affiché ne sont pas forcément réellement à égalité, car le classement doit utiliser la valeur décimale complète.

En cas d’égalité décimale exacte, utiliser un classement ex æquo. Le rang suivant peut suivre la méthode de compétition : `1, 2, 2, 4`.

## 14. Statistiques publiques

### 14.1 Profil d’un joueur

Afficher :

- pseudo ;
- date d’inscription ou mention « profil historique » ;
- Elo actuel ;
- meilleur Elo atteint ;
- pire Elo atteint après le premier match ;
- rang actuel ;
- nombre de matchs ;
- victoires et défaites ;
- taux de victoire ;
- série actuelle et meilleure série de victoires ;
- nombre d’adversaires différents ;
- héros le plus joué ;
- héros ayant le meilleur Elo avec ce joueur ;
- répartition des héros joués ;
- historique récent des matchs validés ;
- courbe d’évolution de l’Elo ;
- résultats contre chaque adversaire.

### 14.2 Statistiques des héros

Pour chaque héros :

- nombre total de matchs ;
- nombre de joueurs différents ;
- victoires et défaites ;
- taux de victoire brut ;
- popularité ;
- meilleur joueur–héros selon l’Elo ;
- taux de victoire contre chaque autre héros ;
- match-ups les plus favorables et défavorables, avec nombre de matchs affiché ;
- historique récent des matchs utilisant ce héros.

Le taux de victoire doit toujours être accompagné du nombre de matchs. Prévoir un filtre de nombre minimal de matchs pour éviter de présenter un taux de 100 % sur un seul match comme significatif.

### 14.3 Confrontation entre deux joueurs

Afficher :

- nombre de matchs validés entre eux ;
- victoires de chacun ;
- taux de victoire ;
- héros utilisés ;
- derniers résultats ;
- variations Elo cumulées dans leurs confrontations.

### 14.4 Confrontation entre deux héros

Afficher :

- nombre de confrontations ;
- victoires de chaque héros ;
- taux de victoire ;
- joueurs concernés ;
- derniers matchs.

### 14.5 Transparence contre la triche

Afficher publiquement sur les profils :

- le nombre d’adversaires différents ;
- la répartition des matchs par adversaire ;
- la date d’inscription du compte lorsqu’elle existe ;
- l’historique complet des matchs validés.

Ne pas afficher l’adresse email ni les données privées.

## 15. Notifications internes

Prévoir un centre de notifications dans l’application.

Événements à notifier :

- compte approuvé ou refusé ;
- match reçu à valider ;
- match validé ;
- match refusé ;
- correction proposée ;
- correction acceptée ou refusée ;
- passage en litige ;
- décision administrative.

Les emails transactionnels sont souhaitables lorsque Supabase permet leur envoi dans les limites de l’offre gratuite, mais l’application ne doit pas dépendre exclusivement des emails. Les notifications internes constituent la source de vérité.

## 16. Pages et navigation

### Pages publiques

- `/` : accueil et principaux chiffres ;
- `/classements` : classement général ;
- `/classements/joueurs-heros` : classement joueur–héros ;
- `/joueurs/[slug]` : profil public d’un joueur ;
- `/heros` : statistiques et liste des héros ;
- `/heros/[slug]` : détail d’un héros ;
- `/matchs` : historique public des matchs validés ;
- `/matchs/[id]` : détail public d’un match validé ;
- `/confrontations/joueurs` : comparaison de deux joueurs ;
- `/confrontations/heros` : comparaison de deux héros ;
- `/connexion` ;
- `/inscription`.

### Pages privées utilisateur

- `/tableau-de-bord` ;
- `/matchs/nouveau` ;
- `/mes-matchs` avec onglets « À valider », « En attente », « Validés », « Refusés » et « Litiges » ;
- `/notifications` ;
- `/compte`.

### Pages administrateur

- `/admin` ;
- `/admin/inscriptions` ;
- `/admin/utilisateurs` ;
- `/admin/matchs` ;
- `/admin/litiges` ;
- `/admin/heros` ;
- `/admin/audit` ;
- `/admin/maintenance`.

## 17. Expérience utilisateur et responsive design

- Interface prioritairement pensée pour smartphone, tout en restant confortable sur ordinateur.
- Navigation claire et peu profonde.
- Formulaires accessibles au clavier.
- Contrastes conformes au minimum aux recommandations WCAG AA.
- États de chargement, succès, erreur et absence de données explicites.
- Confirmation avant toute action irréversible.
- Sur mobile, les classements peuvent utiliser des cartes ou des tableaux à défilement horizontal.
- Les boutons de validation, refus et correction doivent être clairement différenciés.
- Les valeurs Elo gagnées doivent apparaître en vert et les pertes en rouge, sans reposer uniquement sur la couleur.
- Les pages publiques doivent être indexables et disposer de métadonnées adaptées.

## 18. Modèle de données recommandé

Le modèle exact peut évoluer, mais doit couvrir au minimum les entités suivantes.

### `accountRequests`

- `id`
- `authUserId`
- `requestedPseudo`
- `normalizedPseudo`
- `presentationMessage`
- `status`
- `reviewedBy`
- `reviewedAt`
- `rejectionReason`
- `createdAt`

### `profiles`

- `id`
- `authUserId`, nullable et unique
- `pseudo`
- `normalizedPseudo`, unique
- `slug`, unique
- `status`
- `role`
- `createdAt`
- `approvedAt`
- `suspendedAt`

### `heroes`

- `id`
- `name`
- `normalizedName`, unique
- `slug`, unique
- `isActive`
- `createdAt`
- `updatedAt`

### `seasons`

- `id`
- `name`
- `startsAt`
- `endsAt`, nullable
- `isActive`

Créer une saison technique globale initiale. La V1 ne propose aucun changement de saison dans l’interface utilisateur.

### `matches`

- `id`
- `seasonId`
- `createdByProfileId`
- `player1Id`
- `player2Id`
- `currentProposalId`
- `status`
- `playedAt`
- `validatedAt`, nullable
- `validatedByProfileId`, nullable
- `cancelledAt`, nullable
- `createdAt`
- `updatedAt`

### `matchProposals`

- `id`
- `matchId`
- `versionNumber`
- `proposedByProfileId`
- `player1Id`
- `hero1Id`
- `player2Id`
- `hero2Id`
- `winnerProfileId`
- `winnerRemainingHealth`
- `notes`
- `playedAt`
- `createdAt`

### `matchActions`

- `id`
- `matchId`
- `actorProfileId`
- `actionType`
- `fromStatus`
- `toStatus`
- `reason`, nullable
- `metadata`, JSONB
- `createdAt`

### `playerRatings`

- `profileId`
- `seasonId`
- `rating`
- `matchesCount`
- `winsCount`
- `lossesCount`
- `updatedAt`

### `playerHeroRatings`

- `profileId`
- `heroId`
- `seasonId`
- `rating`
- `matchesCount`
- `winsCount`
- `lossesCount`
- `updatedAt`

### `ratingEvents`

- `id`
- `matchId`
- `seasonId`
- `profileId`
- `heroId`, nullable pour l’Elo général
- `ratingType`, général ou joueur–héros
- `ratingBefore`
- `expectedScore`
- `actualScore`
- `ratingChange`
- `ratingAfter`
- `processedAt`

### `notifications`

- `id`
- `recipientProfileId`
- `type`
- `title`
- `message`
- `relatedMatchId`, nullable
- `readAt`, nullable
- `createdAt`

### `auditLogs`

- `id`
- `actorProfileId`, nullable
- `action`
- `entityType`
- `entityId`
- `beforeData`, JSONB nullable
- `afterData`, JSONB nullable
- `createdAt`

Ajouter les clés étrangères, index et contraintes nécessaires. Les contraintes critiques doivent également exister en base et ne pas reposer uniquement sur Zod.

## 19. Sécurité et Row Level Security

Activer la Row Level Security sur toutes les tables exposées par Supabase.

Principes attendus :

- tout le monde peut lire les profils publics actifs ou historiques ;
- tout le monde peut lire les héros et les matchs validés ;
- un utilisateur actif peut créer un match uniquement s’il en est participant ;
- seuls les participants concernés peuvent lire les détails privés d’un match non validé ;
- seul l’adversaire concerné peut valider, refuser ou corriger une proposition ;
- seul le déclarant peut accepter ou refuser une correction ;
- aucun utilisateur ne peut modifier directement les tables Elo ;
- aucun utilisateur ne peut s’attribuer le rôle administrateur ;
- seul l’administrateur peut gérer les héros, comptes, litiges et annulations administratives ;
- les emails ne sont jamais rendus publics ;
- les mutations de statut passent par des fonctions serveur vérifiant l’identité, le rôle et la transition autorisée.

Ajouter une protection contre les soumissions répétées : limitation raisonnable côté serveur et désactivation des doubles clics côté client.

## 20. Import des données historiques

Créer un script d’import idempotent, exécutable localement par l’administrateur.

Le script doit :

1. créer ou retrouver les joueurs historiques par pseudo normalisé ;
2. créer ou retrouver les héros par nom normalisé ;
3. lire les matchs déjà joués depuis un fichier CSV ou XLSX exporté du fichier actuel ;
4. valider chaque ligne et produire un rapport des erreurs ;
5. empêcher les doublons d’import grâce à une clé source stable ;
6. importer les matchs avec le statut `validated` ;
7. conserver la date de match et l’ordre original des lignes ;
8. exécuter le recalcul complet des Elo après l’import ;
9. produire un résumé : lignes lues, importées, ignorées et rejetées.

L’import ne doit pas nécessiter que les joueurs historiques aient déjà créé leur compte.

Ne jamais intégrer le fichier de données personnelles ou ses contenus directement dans le dépôt Git public.

## 21. API et actions serveur

Prévoir des actions serveur ou endpoints typés pour :

- créer une demande d’inscription ;
- approuver ou refuser une demande ;
- relier un compte à un profil historique ;
- créer, modifier avant validation ou annuler une proposition de match ;
- valider ou refuser un match ;
- proposer une correction ;
- accepter ou refuser une correction ;
- résoudre un litige ;
- gérer les héros ;
- suspendre un compte ;
- recalculer les classements ;
- marquer les notifications comme lues.

Chaque action doit :

- authentifier l’utilisateur ;
- vérifier ses autorisations ;
- valider les données avec Zod ;
- exécuter les opérations liées dans une transaction ;
- retourner une erreur métier compréhensible en français ;
- enregistrer les actions sensibles dans l’audit.

## 22. Performance

- Paginer l’historique des matchs et les journaux d’administration.
- Utiliser des index sur les statuts, dates, joueurs, héros et clés étrangères.
- Éviter de recalculer toutes les statistiques à chaque affichage.
- Conserver des tables de classement courant et des événements Elo auditables.
- Utiliser des requêtes agrégées ou vues SQL pour les statistiques.
- Charger les graphiques lourds uniquement lorsqu’ils deviennent visibles.
- Prévoir une stratégie de cache compatible avec la mise à jour immédiate après validation d’un match.

## 23. Tests obligatoires

### Tests unitaires

- calcul Elo à niveau égal ;
- victoire du favori ;
- victoire de l’outsider ;
- symétrie des gains et pertes ;
- conservation des décimales ;
- Elo joueur–héros indépendant de l’Elo général ;
- calcul des séries ;
- détection d’un doublon probable ;
- validation des pseudos ;
- transitions autorisées et interdites des statuts.

### Tests d’intégration

- inscription puis approbation ;
- liaison avec un profil historique ;
- refus d’un compte ;
- déclaration et validation directe d’un match ;
- refus d’un match ;
- proposition et acceptation d’une correction ;
- proposition puis refus d’une correction entraînant un litige ;
- résolution administrative ;
- annulation administrative et recalcul ;
- impossibilité de déclarer un match entre deux autres joueurs ;
- impossibilité de valider son propre match à la place de l’adversaire ;
- respect des politiques RLS ;
- impossibilité de modifier directement son Elo.

### Tests end-to-end

Créer au minimum les scénarios Playwright suivants :

1. visite publique des classements ;
2. inscription email et état en attente ;
3. approbation administrative ;
4. création d’un match par un joueur ;
5. validation par l’adversaire et mise à jour des deux classements ;
6. correction, refus puis résolution d’un litige ;
7. consultation du profil et de la courbe Elo ;
8. ajout d’un héros par l’administrateur.

## 24. Critères d’acceptation de la V1

La V1 est considérée terminée lorsque :

- un visiteur peut consulter les classements sans compte ;
- un utilisateur peut s’inscrire par email ou Google ;
- aucun nouvel utilisateur ne peut déclarer de match avant approbation ;
- l’administrateur peut rattacher un compte à un joueur historique ;
- un utilisateur actif peut déclarer un match auquel il participe ;
- l’adversaire peut valider, refuser ou corriger le résultat ;
- une correction nécessite l’accord du déclarant ;
- un désaccord crée un litige sans effet Elo ;
- seul un match validé affecte les classements ;
- les Elo général et joueur–héros respectent exactement les formules et coefficients définis ;
- l’annulation administrative d’un match reconstruit correctement les classements ;
- les profils, historiques et statistiques publics ne révèlent aucune donnée privée ;
- les joueurs, héros et matchs historiques sont importables sans doublon ;
- les contrôles RLS empêchent les principales manipulations depuis le client ;
- l’application est utilisable sur smartphone et ordinateur ;
- les tests obligatoires passent ;
- le projet peut être déployé sur Vercel avec Supabase sans service payant obligatoire ;
- un README explique clairement l’installation, les variables d’environnement, les migrations, l’import et le déploiement.

## 25. Variables d’environnement attendues

Prévoir et documenter au minimum :

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_EMAIL=
NEXT_PUBLIC_APP_URL=
```

Les secrets ne doivent jamais être commités. Fournir un fichier `.env.example` sans valeur sensible.

## 26. Livrables attendus de Cursor

- code source complet ;
- migrations SQL Supabase ;
- politiques RLS ;
- données initiales des joueurs et héros ;
- script d’import CSV/XLSX des matchs historiques ;
- tests unitaires, intégration et Playwright ;
- fichier `.env.example` ;
- README d’installation et de déploiement ;
- documentation courte de la logique Elo ;
- documentation du workflow des matchs ;
- jeu de données de démonstration distinct des données réelles ;
- configuration Vercel ;
- checklist de mise en production.

## 27. Ordre de réalisation recommandé

Cursor doit avancer par étapes et vérifier chaque étape avant de poursuivre :

1. initialisation du projet et conventions ;
2. schéma PostgreSQL et migrations ;
3. authentification et demandes d’inscription ;
4. administration des comptes et liaison aux profils historiques ;
5. gestion des héros ;
6. moteur Elo testé indépendamment ;
7. workflow complet de déclaration et validation des matchs ;
8. recalcul déterministe des classements ;
9. classements et profils publics ;
10. statistiques avancées ;
11. import des données historiques ;
12. tests RLS et end-to-end ;
13. responsive design, accessibilité et finitions ;
14. documentation et déploiement Vercel.

À chaque étape, Cursor doit :

- analyser les dépendances ;
- créer ou mettre à jour les tests ;
- lancer le lint, le type-check et les tests concernés ;
- corriger les erreurs avant de poursuivre ;
- ne jamais contourner une règle de sécurité pour faire passer un test ;
- signaler toute ambiguïté métier nécessitant une décision.

