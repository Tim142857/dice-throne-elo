export type ChangelogEntry = {
  /** ISO date YYYY-MM-DD */
  date: string;
  title: string;
  items: string[];
};

/**
 * User-facing release notes. Newest first.
 * Update this file when shipping a noticeable change.
 */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    date: "2026-08-02",
    title: "Variation Elo sur les détails de match",
    items: [
      "Chaque match validé affiche désormais le gain ou la perte d’Elo pour les deux joueurs.",
    ],
  },
  {
    date: "2026-07-30",
    title: "Validation automatique des matchs",
    items: [
      "Nouvelle préférence dans Compte : validation manuelle (défaut) ou automatique.",
      "Si vous activez l’auto-validation, les matchs déclarés par vos adversaires sont pris en compte immédiatement — décision basée sur la confiance.",
      "Avertissement explicite avant d’activer cette option.",
    ],
  },
  {
    date: "2026-07-23",
    title: "Protection anti-doublons",
    items: [
      "Impossible de déclarer deux fois le même match (même date, joueurs et héros).",
      "Avertissement si l’adversaire a déjà soumis le même affrontement, avec confirmation avant de continuer.",
      "Verrouillage anti double-clic sur le formulaire de déclaration.",
      "Correction des menus déroulants qui se fermaient au survol.",
    ],
  },
  {
    date: "2026-07-22",
    title: "Matchs nuls et mur d’actualités",
    items: [
      "Les matchs nuls sont pris en charge : résultat déduit automatiquement des PV restants (y compris 0-0).",
      "L’Elo des nuls utilise un score de 0,5 (le favori peut perdre des points).",
      "Nouveau mur d’actualités : badges, records, upsets, duels top 5 et nouveaux joueurs.",
      "Les administrateurs peuvent valider des matchs en attente.",
      "Les badges sont bornés à la date du match (éligibilité depuis le 19-07-2026).",
    ],
  },
  {
    date: "2026-07-20",
    title: "Badges, records et profil enrichi",
    items: [
      "Badges et records compétitifs (séries, Elo, PV, rivalités).",
      "Scores en PV complets sur les matchs et affichages homogènes des dates.",
      "Profil joueur enrichi : stats avancées, insights et courbe Elo corrigée.",
      "Navigation allégée et chargement du profil accéléré.",
      "Ajout de nouveaux héros jouables.",
      "Refonte visuelle et authentification améliorée.",
      "Import de l’historique des matchs en français.",
    ],
  },
  {
    date: "2026-07-20",
    title: "Lancement Dice Throne Elo",
    items: [
      "Classements Elo publics pour les matchs 1 contre 1.",
      "Déclaration de match avec validation mutuelle.",
      "Comptes joueurs, héros et saison globale.",
    ],
  },
];
