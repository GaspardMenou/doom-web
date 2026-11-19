export function scorePoints(state) {
  return state.status === 'won' ? 60 + state.playerHealth * 10 : 0;
}
