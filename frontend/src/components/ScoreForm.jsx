import React, {useRef, useState} from 'react';
import {jsonBody} from '../api/api.js';
import {normalizePlayerName} from '../api/events.js';

export function ScoreForm({points, playerName, request, onSaved}) {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const locked = useRef(false);

  async function save(event) {
    event.preventDefault();
    if (locked.current) return;
    locked.current = true;
    setStatus('saving');
    setError('');
    try {
      // shortcut: réponse perdue après écriture = doublon possible au nouvel essai ; ajouter une clé d’idempotence si nécessaire.
      await request('/scores/', jsonBody('POST', {player: normalizePlayerName(playerName), points}));
    } catch (error) {
      locked.current = false;
      setStatus('idle');
      setError(error.message);
      return;
    }
    setStatus('saved');
    onSaved();
  }

  return <section aria-label="Résultat de la partie">
    <p>Score : <strong>{points} points</strong>.</p>
    <p className="score-player">Joueur : <strong>{playerName}</strong></p>
    <p id="score-rule" className="hint">Éliminations + 500 par secteur. Victoire finale : 1 000 + 100 par PV restant. Les éliminations comptent aussi en cas de défaite.</p>
    {status === 'saved' ? <p role="status">Score enregistré.</p> : <form onSubmit={save}>
      <div className="input-row">
        <button disabled={status === 'saving'}>{status === 'saving' ? 'Enregistrement…' : 'Enregistrer le score'}</button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
    </form>}
  </section>;
}
