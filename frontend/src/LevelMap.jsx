import React from 'react';
import {LEVELS} from './levels/index.js';

export function LevelMap({level = LEVELS[0]}) {
  const exit = level.exit;
  const half = level.size / 2;
  const scale = 300 / level.size;
  const grid = `map-grid-${level.id}`;
  return <figure className="level-map">
    <figcaption>Plan : {level.name} <span>{level.enemies.length} gardes. Repérez les passages.</span></figcaption>
    <svg viewBox="0 0 360 330" role="img" aria-label={`Plan du secteur ${level.name} : départ, ${level.enemies.length} gardes et sortie.`}>
      <defs><pattern id={grid} width={scale} height={scale} patternUnits="userSpaceOnUse"><path d={`M${scale} 0H0V${scale}`} fill="none" stroke="currentColor" strokeWidth="0.5" /></pattern></defs>
      <rect x="30" y="15" width="300" height="300" fill={`url(#${grid})`} className="map-grid" />
      <g transform={`translate(180 165) scale(${scale})`}>
        <rect x={-half} y={-half} width={level.size} height={level.size} className="map-wall" />
        {level.walls.map((wall, index) => <rect key={index} x={wall.x - wall.width / 2} y={wall.z - wall.depth / 2} width={wall.width} height={wall.depth} className="map-divider" />)}
        <rect x={exit.x - exit.width / 2} y={exit.z - exit.depth / 2} width={exit.width} height={exit.depth} className="map-exit" />
        {level.enemies.map(enemy => <rect key={enemy.id} x={enemy.x - 0.25} y={enemy.z - 0.25} width="0.5" height="0.5" className="map-enemy" />)}
        <circle cx={level.spawn.x} cy={level.spawn.z} r="0.22" className="map-player" />
      </g>
      <text x={180 + level.spawn.x * scale} y={182 + level.spawn.z * scale} textAnchor="middle">DÉPART</text>
      <text x={180 + exit.x * scale} y={153 + exit.z * scale} textAnchor="middle" className="map-exit-label">SORTIE</text>
    </svg>
    <div className="map-legend"><span>Point blanc : vous</span><span>Rouge : gardes</span><span>Vert : sortie</span></div>
  </figure>;
}
