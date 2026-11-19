import React from 'react';
import {PLAYER_MAX_HEALTH} from './game.js';
import {LEVELS} from './levels/index.js';

export function Hud({state}) {
  const health = state.playerHealth ?? PLAYER_MAX_HEALTH;
  const levelIndex = state.levelIndex ?? 0;
  const enemies = state.enemies ?? LEVELS[levelIndex].enemies;
  const remaining = enemies.filter(enemy => enemy.health !== 0).length;
  return <footer className={`hud${health === 0 ? ' is-dead' : ''}`} aria-label="État du joueur">
    <div className="hud-cell weapon-cell"><span>Arme</span><strong>Pistolet</strong><small>Maintenir clic / Espace</small></div>
    <div className="hud-cell ammo-cell"><span>Munitions</span><strong aria-label="Illimitées">∞</strong><small>Illimitées</small></div>
    <div className="hud-cell health-cell">
      <label htmlFor="player-health">Vie</label>
      <strong>{health}<small> / {PLAYER_MAX_HEALTH}</small></strong>
      <progress id="player-health" value={health} max={PLAYER_MAX_HEALTH} />
    </div>
    <div className="hud-cell enemy-cell"><span>Hostiles</span><strong>{remaining}<small> / {enemies.length}</small></strong><small>{remaining === 0 ? 'Zone nettoyée' : `${state.kills ?? 0} éliminés au total`}</small></div>
    <div className="hud-cell mission-cell"><span>Objectif : sortie</span><strong>{LEVELS[levelIndex].name}</strong><small>Niveau {levelIndex + 1} / {LEVELS.length}</small></div>
  </footer>;
}
