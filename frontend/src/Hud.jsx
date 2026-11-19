import React from 'react';
import {PLAYER_MAX_HEALTH} from './game.js';

export function Hud({state}) {
  const health = state.playerHealth ?? PLAYER_MAX_HEALTH;
  return <footer className={`hud${health === 0 ? ' is-dead' : ''}`} aria-label="État du joueur">
    <div className="hud-cell weapon-cell"><span>Arme</span><strong>Pistolet</strong><small>Clic gauche / Espace</small></div>
    <div className="hud-cell ammo-cell"><span>Munitions</span><strong aria-label="Illimitées">∞</strong><small>Illimitées</small></div>
    <div className="hud-cell health-cell">
      <label htmlFor="player-health">Vie</label>
      <strong>{health}<small> / {PLAYER_MAX_HEALTH}</small></strong>
      <progress id="player-health" value={health} max={PLAYER_MAX_HEALTH} />
    </div>
    <div className="hud-cell enemy-cell"><span>Ennemi</span><strong>{state.targetHealth ?? 2}<small> PV</small></strong><small>{state.targetHealth === 0 ? 'Neutralisé' : 'Hostile'}</small></div>
    <div className="hud-cell mission-cell"><span>Objectif</span><strong>La sortie</strong><small>Survivez. Explorez. Sortez.</small></div>
  </footer>;
}
