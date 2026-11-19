import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {mountGame} from './canvas.js';
import {createApi} from './api.js';
import {scorePoints} from './score.js';
import {ScoreForm} from './ScoreForm.jsx';
import {Hud} from './Hud.jsx';
import {LevelMap} from './LevelMap.jsx';
import {toggleFullscreen} from './fullscreen.js';
import './style.css';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const request = createApi(apiUrl);

function App() {
  const shell = useRef(null);
  const canvas = useRef(null);
  const game = useRef(null);
  const scoresRequest = useRef(null);
  const [state, setState] = useState({status: 'paused'});
  const [home, setHome] = useState(true);
  const [scores, setScores] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');

  useEffect(() => {
    try {
      game.current = mountGame(canvas.current, setState);
    } catch {
      setState({status: 'unavailable', error: 'L’affichage 3D est indisponible. Essayez un navigateur avec WebGL 2 activé.'});
    }
    return () => { game.current?.destroy(); game.current = null; };
  }, []);

  async function loadScores() {
    scoresRequest.current?.abort();
    const controller = new AbortController();
    scoresRequest.current = controller;
    setLoading(true);
    try {
      const rows = await request('/scores/', {signal: controller.signal});
      setScores(rows);
      setError('');
    } catch (error) {
      if (error.name !== 'AbortError') setError(error.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    loadScores();
    return () => scoresRequest.current?.abort();
  }, []);

  useEffect(() => {
    function changed() {
      setFullscreen(document.fullscreenElement === shell.current);
      game.current?.pause();
    }
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);

  async function changeFullscreen() {
    game.current?.pause();
    try {
      await toggleFullscreen(shell.current);
      setFullscreenError('');
    } catch {
      setFullscreenError('Le plein écran est indisponible. Vous pouvez continuer dans cette fenêtre.');
    }
  }

  function start() {
    if (!game.current) return;
    // La capture nécessite un Canvas visible et le clic utilisateur.
    flushSync(() => {
      game.current.restart();
      setHome(false);
    });
    game.current.resume();
  }

  function goHome() {
    game.current?.pause();
    setHome(true);
  }

  const playing = state.status === 'playing';
  const won = state.status === 'won';
  const lost = state.status === 'lost';
  const unavailable = state.status === 'unavailable';
  return <main ref={shell} className={`app-shell ${home ? 'is-home' : 'is-game'}`}>
    <header className="topbar">
      <span className="brand">D<span aria-hidden="true">/</span>W <small>DOOM WEB</small></span>
      <div className="topbar-actions">
        {!home && playing && <button className="utility" onClick={() => game.current.pause()}>Pause <kbd>Échap</kbd></button>}
        <button className="utility fullscreen-button" onClick={changeFullscreen} aria-pressed={fullscreen}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6" /></svg>
          {fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        </button>
      </div>
    </header>
    {fullscreenError && <p role="alert" className="error fullscreen-error">{fullscreenError}</p>}

    {home && <div className="home-content">
      <section className="home-grid" aria-label="Accueil">
        <div className="mission-intro">
          <h1>Doom <span>Web</span></h1>
          <h2>Une seule issue. Restez en vie.</h2>
          <p>Traversez le secteur, évitez l’ennemi et atteignez la sortie verte. Ou faites parler la poudre.</p>
          <button className="primary play-button" autoFocus disabled={unavailable} onClick={start}>Jouer <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
          <p className="mission-facts">3 PV au départ <span>·</span> Munitions illimitées <span>·</span> Solo</p>
          {unavailable && <p role="alert" className="error">{state.error}</p>}
        </div>
        <LevelMap />
      </section>
      <section className="score-panel" aria-label="Classement">
        <div className="list-heading"><h2>Tableau des survivants <span>Top 10</span></h2><button className="utility" disabled={loading} onClick={() => loadScores()}>Recharger</button></div>
        {loading ? <p className="empty-score">Lecture du classement…</p> : scores.length === 0 ? <p className="empty-score">Aucun score pour le moment. Terminez une partie pour inscrire votre nom.</p> : <ol>{scores.map(score => <li key={score.id}><span>{score.player}</span><strong>{score.points}<small> PTS</small></strong></li>)}</ol>}
        {error && <p role="alert" className="error">{error}</p>}
      </section>
      <p className="score-disclaimer">Classement de démonstration. Scores déclarés par les joueurs.</p>
    </div>}

    <section className="game-screen" aria-label="Le jeu" hidden={home}>
      <div className="viewport">
        <canvas ref={canvas} width="640" height="400" tabIndex={home || !playing ? -1 : 0} aria-label="Niveau en vue à la première personne. Cliquez pour reprendre." aria-describedby="commands" />
        {playing && <>
          <svg className="crosshair" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v5m0 8v5M3 12h5m8 0h5" /></svg>
          <img className="weapon-view" src="/art/pistol-view.png" alt="" />
        </>}
      </div>
      <p className="game-message" role="status">{won ? 'Victoire : vous avez atteint la sortie !' : lost ? 'Défaite : vous n’avez plus de vie.' : playing ? (state.lastShot || 'Objectif : rejoignez la sortie verte.') : 'En pause : la partie vous attend.'}</p>
      <Hud state={state} />
      {!playing && !home && <section className={`game-overlay${won ? ' has-won' : ''}`} aria-label={won || lost ? 'Fin de partie' : 'Menu de pause'}>
        <div className="menu-panel">
          <h2>{won ? 'Victoire' : lost ? 'Défaite' : unavailable ? 'Signal perdu' : 'En pause'}</h2>
          <p>{won ? 'Vous avez trouvé la sortie. Inscrivez votre nom.' : lost ? 'Le secteur a eu raison de vous. Retentez votre chance.' : 'Soufflez un instant. Le secteur peut attendre.'}</p>
          {state.error && <p role="alert" className="error">{state.error}</p>}
          {(won || lost) && <ScoreForm points={scorePoints(state)} request={request} onSaved={loadScores} />}
          <div className="menu-actions">
            {!won && !lost && !unavailable && <button className="primary" autoFocus onClick={() => game.current.resume()}>Reprendre</button>}
            {!unavailable && <button className={won || lost ? 'primary' : 'secondary'} autoFocus={won || lost} onClick={start}>{won || lost ? 'Rejouer' : 'Recommencer'}</button>}
            <button className="secondary" onClick={goHome}>Retour à l’accueil</button>
          </div>
        </div>
      </section>}
    </section>

    <div id="commands" className="commands" hidden={!home && playing}>
      <span><kbd>ZQSD</kbd> / <kbd>WASD</kbd> Marcher</span><span><kbd>Souris</kbd> Viser</span><span><kbd>Clic</kbd> / <kbd>Espace</kbd> Tirer</span><span><kbd>Échap</kbd> Pause</span>
    </div>
  </main>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
