export type AchievementCategory =
  | "progression"
  | "streak"
  | "health"
  | "underdog"
  | "heroes"
  | "loyalty"
  | "comeback"
  | "elo";

export type AchievementDefinition = {
  code: string;
  name: string;
  description: string;
  conditionLabel: string;
  category: AchievementCategory;
  icon: string;
  sortOrder: number;
  isSecret: boolean;
  /** Cumulative progress target when applicable (matches, heroes, elo…). */
  progressTarget?: number;
  progressKind?:
    | "matches"
    | "wins"
    | "winStreak"
    | "heroWins"
    | "sameHeroMatches"
    | "elo"
    | "underdog"
    | "health";
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    code: "first_win",
    name: "Fin du tutoriel",
    description: "Les vraies parties peuvent commencer.",
    conditionLabel: "Remporter sa première victoire éligible",
    category: "progression",
    icon: "🏁",
    sortOrder: 10,
    isSecret: false,
    progressTarget: 1,
    progressKind: "wins",
  },
  {
    code: "matches_10",
    name: "Ça commence à transpirer",
    description: "Ce n’est officiellement plus un simple essai.",
    conditionLabel: "Disputer 10 matchs éligibles",
    category: "progression",
    icon: "💧",
    sortOrder: 20,
    isSecret: false,
    progressTarget: 10,
    progressKind: "matches",
  },
  {
    code: "matches_25",
    name: "Plus qu’un jeu",
    description: "Tu consultes probablement ton Elo avant de dormir.",
    conditionLabel: "Disputer 25 matchs éligibles",
    category: "progression",
    icon: "🎮",
    sortOrder: 30,
    isSecret: false,
    progressTarget: 25,
    progressKind: "matches",
  },
  {
    code: "matches_50",
    name: "Le sommeil est optionnel",
    description: "Encore une dernière et j’arrête.",
    conditionLabel: "Disputer 50 matchs éligibles",
    category: "progression",
    icon: "😴",
    sortOrder: 40,
    isSecret: false,
    progressTarget: 50,
    progressKind: "matches",
  },
  {
    code: "matches_100",
    name: "Touchez de l’herbe",
    description: "Le classement ne va pas monter tout seul.",
    conditionLabel: "Disputer 100 matchs éligibles",
    category: "progression",
    icon: "🌿",
    sortOrder: 50,
    isSecret: false,
    progressTarget: 100,
    progressKind: "matches",
  },
  {
    code: "win_streak_3",
    name: "Échauffement terminé",
    description: "Trois victimes, aucune culpabilité.",
    conditionLabel: "Remporter 3 matchs éligibles consécutifs",
    category: "streak",
    icon: "🔥",
    sortOrder: 60,
    isSecret: false,
    progressTarget: 3,
    progressKind: "winStreak",
  },
  {
    code: "win_streak_5",
    name: "File d’attente classée",
    description: "Le matchmaking commence à s’inquiéter.",
    conditionLabel: "Remporter 5 matchs éligibles consécutifs",
    category: "streak",
    icon: "⚡",
    sortOrder: 70,
    isSecret: false,
    progressTarget: 5,
    progressKind: "winStreak",
  },
  {
    code: "win_streak_10",
    name: "Quelqu’un peut le nerf ?",
    description: "Ceci n’est probablement plus de la chance.",
    conditionLabel: "Remporter 10 matchs éligibles consécutifs",
    category: "streak",
    icon: "☢️",
    sortOrder: 80,
    isSecret: false,
    progressTarget: 10,
    progressKind: "winStreak",
  },
  {
    code: "win_one_hp",
    name: "Calculé.",
    description: "Tout était sous contrôle. Absolument tout.",
    conditionLabel: "Gagner un match éligible avec exactement 1 PV restant",
    category: "health",
    icon: "❤️‍🩹",
    sortOrder: 90,
    isSecret: false,
    progressKind: "health",
  },
  {
    code: "win_thirty_hp",
    name: "Même pas mal",
    description: "L’adversaire a pourtant essayé.",
    conditionLabel: "Gagner un match éligible avec au moins 30 PV restants",
    category: "health",
    icon: "🛡️",
    sortOrder: 100,
    isSecret: false,
    progressKind: "health",
  },
  {
    code: "underdog_200",
    name: "Le matchmaking tousse",
    description: "Sur le papier, ce n’était pas vraiment prévu.",
    conditionLabel: "Gagner avec au moins 200 Elo de moins que l’adversaire",
    category: "underdog",
    icon: "🥊",
    sortOrder: 110,
    isSecret: false,
    progressTarget: 200,
    progressKind: "underdog",
  },
  {
    code: "underdog_500",
    name: "Le matchmaking va très bien",
    description: "Une défaite statistiquement embarrassante.",
    conditionLabel: "Gagner avec au moins 500 Elo de moins que l’adversaire",
    category: "underdog",
    icon: "🎯",
    sortOrder: 120,
    isSecret: false,
    progressTarget: 500,
    progressKind: "underdog",
  },
  {
    code: "underdog_1000",
    name: "David avait au moins une fronde",
    description: "Les probabilités viennent de demander un arrêt maladie.",
    conditionLabel: "Gagner avec au moins 1 000 Elo de moins que l’adversaire",
    category: "underdog",
    icon: "🏹",
    sortOrder: 130,
    isSecret: false,
    progressTarget: 1000,
    progressKind: "underdog",
  },
  {
    code: "hero_wins_5",
    name: "Main flexible",
    description: "Aucun besoin de choisir un personnage principal.",
    conditionLabel: "Gagner avec 5 héros différents",
    category: "heroes",
    icon: "🎲",
    sortOrder: 140,
    isSecret: false,
    progressTarget: 5,
    progressKind: "heroWins",
  },
  {
    code: "hero_wins_10",
    name: "Random Select Enjoyer",
    description: "Le concept de main commence à perdre son sens.",
    conditionLabel: "Gagner avec 10 héros différents",
    category: "heroes",
    icon: "🔀",
    sortOrder: 150,
    isSecret: false,
    progressTarget: 10,
    progressKind: "heroWins",
  },
  {
    code: "hero_wins_20",
    name: "Le roster est mon main",
    description: "Pourquoi choisir quand on peut tout jouer ?",
    category: "heroes",
    conditionLabel: "Gagner avec 20 héros différents",
    icon: "📚",
    sortOrder: 160,
    isSecret: false,
    progressTarget: 20,
    progressKind: "heroWins",
  },
  {
    code: "hero_wins_all",
    name: "Écran de sélection terminé",
    description: "Félicitations, tu as fini le menu des personnages.",
    conditionLabel: "Victoire avec chaque héros actif",
    category: "heroes",
    icon: "👑",
    sortOrder: 170,
    isSecret: false,
    progressKind: "heroWins",
  },
  {
    code: "same_hero_10",
    name: "OTP assumé",
    description: "Pourquoi changer une équipe qui lance des dés ?",
    conditionLabel: "Disputer 10 matchs éligibles avec le même héros",
    category: "loyalty",
    icon: "💍",
    sortOrder: 180,
    isSecret: false,
    progressTarget: 10,
    progressKind: "sameHeroMatches",
  },
  {
    code: "comeback_after_five_losses",
    name: "La remontada commence ici",
    description: "Le plan était simplement très long à démarrer.",
    conditionLabel: "Gagner après au moins 5 défaites éligibles consécutives",
    category: "comeback",
    icon: "📈",
    sortOrder: 190,
    isSecret: false,
  },
  {
    code: "elo_1200",
    name: "Ça devient sérieux",
    description: "Toute défaite est maintenant une crise personnelle.",
    conditionLabel: "Atteindre ou dépasser 1 200 Elo",
    category: "elo",
    icon: "📊",
    sortOrder: 200,
    isSecret: false,
    progressTarget: 1200,
    progressKind: "elo",
  },
  {
    code: "elo_1500",
    name: "Patron du lobby",
    description: "Merci de laisser quelques points aux autres.",
    conditionLabel: "Atteindre ou dépasser 1 500 Elo",
    category: "elo",
    icon: "💼",
    sortOrder: 210,
    isSecret: false,
    progressTarget: 1500,
    progressKind: "elo",
  },
  {
    code: "elo_2000",
    name: "Boss final non contractuel",
    description: "Le matchmaking cherche désormais un volontaire.",
    conditionLabel: "Atteindre ou dépasser 2 000 Elo",
    category: "elo",
    icon: "🐉",
    sortOrder: 220,
    isSecret: false,
    progressTarget: 2000,
    progressKind: "elo",
  },
];

export function getAchievementDefinition(pCode: string): AchievementDefinition | undefined {
  return ACHIEVEMENT_DEFINITIONS.find((pItem) => pItem.code === pCode);
}
