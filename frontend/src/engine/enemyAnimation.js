export function enemyFrame(enemy, seconds) {
  if (enemy.mode === 'attack') return 3;
  if (enemy.mode === 'walk') return 1 + Math.floor(seconds * 6) % 2;
  return 0;
}
