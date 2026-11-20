export const ENEMY_TYPES = {
  guard: {
    label: 'Garde', health: 2, speed: 2.2, radius: 0.5, scale: 1, score: 100,
    sprite: '/art/enemy-guard-sheet.png', attackRange: 1.1, attackDelay: 1,
    detectRange: 14, forgetRange: 28,
  },
  runner: {
    label: 'Traqueur', health: 1, speed: 5, radius: 0.4, scale: 0.85, score: 150,
    sprite: '/art/enemy-runner-sheet.png', attackRange: 1, attackDelay: 0.7,
    detectRange: 16, forgetRange: 32,
  },
  brute: {
    label: 'Colosse', health: 5, speed: 1.6, radius: 0.7, scale: 1.35, score: 400,
    sprite: '/art/enemy-guard-sheet.png', attackRange: 1.5, attackDelay: 1.3,
    detectRange: 14, forgetRange: 28,
  },
  gunner: {
    label: 'Sentinelle', health: 3, speed: 2.2, radius: 0.5, scale: 1, score: 250,
    sprite: '/art/enemy-gunner-sheet.png', attackRange: 18, attackDelay: 1.8,
    detectRange: 22, forgetRange: 36, ranged: true,
  },
};
