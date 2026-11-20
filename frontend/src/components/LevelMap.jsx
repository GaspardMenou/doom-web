import React from 'react';
import {LEVELS} from '../game/levels/index.js';

export function LevelMap({level = LEVELS[0], player, enemies = level.enemies, medkits = level.medkits ?? []}) {
  const exit = level.exit;
  const half = level.size / 2;
  const scale = 300 / level.size;
  const grid = `map-grid-${level.id}`;
  return <figure className="level-map">
    <figcaption>Plan : {level.name} <span>{level.size} × {level.size} m · {level.enemies.length} hostiles</span></figcaption>
    <svg viewBox="0 0 360 330" role="img" aria-label={`Plan du secteur ${level.name} : départ, ${level.enemies.length} gardes et sortie.`}>
      <defs><pattern id={grid} width={scale * 4} height={scale * 4} patternUnits="userSpaceOnUse"><path d={`M${scale * 4} 0H0V${scale * 4}`} fill="none" stroke="currentColor" strokeWidth="0.5" /></pattern></defs>
      <rect x="30" y="15" width="300" height="300" fill={`url(#${grid})`} className="map-grid" />
      <g transform={`translate(180 165) scale(${scale})`}>
        <rect x={-half} y={-half} width={level.size} height={level.size} className="map-wall" />
        {level.walls.map((wall, index) => <rect key={index} x={wall.x - wall.width / 2} y={wall.z - wall.depth / 2} width={wall.width} height={wall.depth} className="map-divider" />)}
        <rect x={exit.x - exit.width / 2} y={exit.z - exit.depth / 2} width={exit.width} height={exit.depth} className="map-exit" />
        {enemies.filter(enemy => enemy.health !== 0).map(enemy => <circle key={enemy.id} cx={enemy.x} cy={enemy.z} r={level.size / 150} className="map-enemy" />)}
        {medkits.filter(medkit => !medkit.taken).map(medkit => <path key={medkit.id} d={`M${medkit.x - 0.7} ${medkit.z}h1.4m-0.7 -0.7v1.4`} className="map-health" />)}
        <circle cx={(player ?? level.spawn).x} cy={(player ?? level.spawn).z} r={level.size / 100} className="map-player"
          data-player-x={player?.x} data-player-z={player?.z} />
        {player && <path d={`M${player.x} ${player.z}l${-Math.sin(player.angle) * level.size / 18} ${-Math.cos(player.angle) * level.size / 18}`} className="map-direction" />}
      </g>
      {!player && <text x={180 + level.spawn.x * scale} y={182 + level.spawn.z * scale} textAnchor="middle">DÉPART</text>}
      <text x={180 + exit.x * scale} y={153 + exit.z * scale} textAnchor="middle" className="map-exit-label">SAS</text>
    </svg>
    <div className="map-legend"><span>Blanc : vous</span><span>Rouge : hostiles</span><span>Vert : sas</span></div>
  </figure>;
}
