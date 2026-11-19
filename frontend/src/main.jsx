import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {mountGame} from './canvas.js';
import {createApi} from './api.js';
import './style.css';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const request = createApi(apiUrl);

function App() {
  const canvas = useRef(null);
  const game = useRef(null);
  const [state, setState] = useState({status: 'paused'});
  const [scores, setScores] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      game.current = mountGame(canvas.current, setState);
    } catch {
      setState({status: 'unavailable', error: 'L’affichage 3D est indisponible. Essayez un navigateur avec WebGL 2 activé.'});
    }
    return () => { game.current?.destroy(); game.current = null; };
  }, []);

  async function loadScores(signal) {
    setLoading(true);
    try {
      const rows = await request('/scores/', {signal});
      setScores(rows);
      setError('');
    } catch (error) {
      if (error.name !== 'AbortError') setError(error.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadScores(controller.signal);
    return () => controller.abort();
  }, []);

  const playing = state.status === 'playing';
  const unavailable = state.status === 'unavailable';
  return <main>
    <p className="eyebrow">DOOM WEB · SPRINT 1</p>
    <h1>Une pièce. Quatre murs.</h1>
    <p id="commands">ZQSD, WASD ou les flèches pour marcher. Souris pour regarder. Échap pour libérer la souris et mettre en pause.</p>
    <div className="game-layout"><section aria-label="Le jeu">
      <canvas ref={canvas} width="640" height="400" tabIndex="0" aria-label="Pièce en vue à la première personne. Cliquez pour entrer." aria-describedby="commands" />
      <div className="controls">
        <button disabled={playing || unavailable} onClick={() => game.current?.resume()}>Entrer dans la pièce</button>
        <button disabled={!playing} onClick={() => game.current.pause()}>Pause</button>
        <button disabled={unavailable} onClick={() => game.current.restart()}>Revenir au centre</button>
      </div>
      <p className="hint">Explorez la pièce : les murs bloquent vos déplacements. Cliquez dans le jeu ou sur Entrer pour capturer la souris.</p>
      <p role="status">{playing ? 'Exploration en cours.' : unavailable ? 'Affichage 3D indisponible.' : 'En pause — entrez dans la pièce pour explorer.'}</p>
      {state.error && <p role="alert" className="error">{state.error}</p>}
    </section><aside>
      <div className="list-heading"><h2>Top 10</h2><button className="secondary" disabled={loading} onClick={() => loadScores()}>Recharger</button></div>
      {loading ? <p>Chargement…</p> : scores.length === 0 ? <p>Aucun score pour le moment.</p> : <ol>{scores.map(score => <li key={score.id}><span>{score.player}</span><strong>{score.points}</strong></li>)}</ol>}
      <p className="hint">Ce classement de démonstration accepte les scores déclarés par le client.</p>
    </aside></div>
    {error && <p role="alert" className="error">{error}</p>}
    <footer>Backend : <code>{apiUrl}</code></footer>
  </main>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
