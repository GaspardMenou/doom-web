export function readPlayerStats(rows) {
  if (!Array.isArray(rows) || rows.some(row =>
    !row || typeof row.player !== 'string' || !row.player.trim() ||
    !Number.isSafeInteger(row.total_points) || row.total_points < 0 ||
    !Number.isSafeInteger(row.games_played) || row.games_played < 0 ||
    !Number.isFinite(row.average_points) || row.average_points < 0)) {
    throw new Error('Les statistiques reçues sont illisibles. Réessayez.');
  }
  return rows;
}
