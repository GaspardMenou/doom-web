import React from 'react';
import {EXIT, WALLS} from './level.js';

export function LevelMap() {
  return <figure className="level-map">
    <figcaption>Plan du niveau <span>Repérez la sortie.</span></figcaption>
    <svg viewBox="0 0 360 330" role="img" aria-label="Le départ est en bas. Passez à droite du mur pour rejoindre la sortie verte en haut à gauche.">
      <defs><pattern id="map-grid" width="30" height="30" patternUnits="userSpaceOnUse"><path d="M30 0H0V30" fill="none" stroke="currentColor" strokeWidth="0.5" /></pattern></defs>
      <rect x="30" y="15" width="300" height="300" fill="url(#map-grid)" className="map-grid" />
      <g transform="translate(180 165) scale(30)">
        <rect x="-5" y="-5" width="10" height="10" className="map-wall" />
        {WALLS.map((wall, index) => <rect key={index} x={wall.x - wall.width / 2} y={wall.z - wall.depth / 2} width={wall.width} height={wall.depth} className="map-divider" />)}
        <path d="M0 2H3.5V-3.5H-3.5" className="map-route" />
        <rect x={EXIT.x - EXIT.width / 2} y={EXIT.z - EXIT.depth / 2} width={EXIT.width} height={EXIT.depth} className="map-exit" />
        <rect x="-0.25" y="-2.25" width="0.5" height="0.5" className="map-enemy" />
        <circle cx="0" cy="2" r="0.22" className="map-player" />
      </g>
      <text x="185" y="250">DÉPART</text><text x="44" y="40" className="map-exit-label">SORTIE</text>
    </svg>
    <div className="map-legend"><span>Point blanc : vous</span><span>Rouge : ennemi</span><span>Vert : sortie</span></div>
  </figure>;
}
