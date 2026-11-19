const SPEED = 1;
const ATTACK_RANGE = 1;
const ATTACK_DELAY = 1;

export function advanceEnemy(previous, dt) {
  // shortcut: poursuite directe dans une pièce vide ; adapter le trajet quand le niveau aura des obstacles.
  if (dt <= 0 || previous.targetHealth === 0 || previous.status !== 'playing') return previous;

  const enemy = {...previous.enemy};
  const dx = previous.player.x - enemy.x;
  const dz = previous.player.z - enemy.z;
  const distance = Math.hypot(dx, dz);
  const step = Math.min(SPEED * dt, Math.max(0, distance - ATTACK_RANGE));
  if (distance > 0) {
    enemy.x += dx / distance * step;
    enemy.z += dz / distance * step;
  }

  let playerHealth = previous.playerHealth;
  let attackCooldown = Math.max(0, previous.attackCooldown - dt);
  if (distance - step <= ATTACK_RANGE + 0.000001 && attackCooldown <= 0.000001) {
    playerHealth = Math.max(0, playerHealth - 1);
    attackCooldown = ATTACK_DELAY;
  }

  return {
    ...previous,
    enemy,
    playerHealth,
    attackCooldown,
    status: playerHealth === 0 ? 'lost' : previous.status,
  };
}
