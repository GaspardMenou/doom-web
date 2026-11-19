import React, {useRef, useState} from 'react';
import {jsonBody} from './api.js';

export function ScoreForm({points, request, onSaved}) {
  const [player, setPlayer] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const locked = useRef(false);

  async function save(event) {
    event.preventDefault();
    if (locked.current) return;
    const name = player.trim();
    if (!name) {
      setError('Saisissez un pseudo de 1 à 24 caractères.');
      return;
    }
    locked.current = true;
    setStatus('saving');
    setError('');
    try {
      // shortcut: réponse perdue après écriture = doublon possible au nouvel essai ; ajouter une clé d’idempotence si nécessaire.
      await request('/scores/', jsonBody('POST', {player: name, points}));
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
    <p id="score-rule" className="hint">Éliminations + 500 par secteur. Victoire finale : 1 000 + 100 par PV restant. Les éliminations comptent aussi en cas de défaite.</p>
    {status === 'saved' ? <p role="status">Score enregistré.</p> : <form onSubmit={save}>
      <label htmlFor="score-player">Pseudo</label>
      <div className="input-row">
        <input id="score-player" name="player" value={player} onChange={event => setPlayer(event.target.value)} required maxLength={24} autoComplete="nickname" aria-describedby="score-rule" disabled={status === 'saving'} />
        <button disabled={status === 'saving'}>{status === 'saving' ? 'Enregistrement…' : 'Enregistrer le score'}</button>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
    </form>}
  </section>;
}
