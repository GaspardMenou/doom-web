export function scorePoints(state) {
  const completed = (state.levelIndex ?? 0) + (state.status === 'won' ? 1 : 0);
  const finalVictory = state.status === 'won' && completed === 3;
  return (state.killPoints ?? 0) + completed * 500 + (finalVictory ? 1000 + state.playerHealth * 100 : 0);
}
