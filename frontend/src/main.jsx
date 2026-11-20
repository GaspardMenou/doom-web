import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {mountGame} from './engine/canvas.js';
import {createApi} from './api/api.js';
import {connectEvents, normalizePlayerName} from './api/events.js';
import {createGameEventSender} from './api/gameEvents.js';
import {scorePoints} from './game/score.js';
import {ScoreForm} from './components/ScoreForm.jsx';
import {Hud} from './components/Hud.jsx';
import {LevelMap} from './components/LevelMap.jsx';
import {DamageOverlay} from './components/DamageOverlay.jsx';
import {EventFeed} from './components/EventFeed.jsx';
import {toggleFullscreen} from './engine/fullscreen.js';
import {PlayerStats} from './components/PlayerStats.jsx';
import {LEVELS} from './game/levels/index.js';
import './style.css';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
const request = createApi(apiUrl);

function App() {
  const shell = useRef(null);
  const canvas = useRef(null);
  const game = useRef(null);
  const scoresRequest = useRef(null);
  const connection = useRef(null);
  const nextEventId = useRef(0);
  const eventSender = useRef(createGameEventSender());
  const [playerName, setPlayerName] = useState('');
  const [playerError, setPlayerError] = useState('');
  const [events, setEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [state, setState] = useState({status: 'paused'});
  const [home, setHome] = useState(true);
  const [scores, setScores] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const [showPlayerStats, setShowPlayerStats] = useState(false);

  useEffect(() => {
    const client = connectEvents(apiUrl, {
      onStatus: setConnectionStatus,
      onEvent(message) {
        const received = {...message, id: ++nextEventId.current};
        setEvents(previous => [...previous.slice(-49), received]);
      },
    });
    connection.current = client;
    return () => { client.close(); connection.current = null; };
  }, []);

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

  function start(seed) {
    if (!game.current) return;
    let name;
    try { name = normalizePlayerName(playerName); }
    catch (error) { setPlayerError(error.message); return; }
    // La capture nécessite un Canvas visible et le clic utilisateur.
    flushSync(() => {
      game.current.restart(seed);
      setPlayerName(name);
      setPlayerError('');
      setHome(false);
    });
    eventSender.current.reset();
    game.current.resume();
  }

  function goHome() {
    game.current?.pause();
    setHome(true);
  }

  function goNext() {
    flushSync(() => game.current.nextLevel());
    game.current.resume();
  }

  const playing = state.status === 'playing';
  const won = state.status === 'won';
  const lost = state.status === 'lost';
  const unavailable = state.status === 'unavailable';
  const levelIndex = state.levelIndex ?? 0;
  const level = state.level ?? LEVELS[levelIndex];
  const hasNext = levelIndex < LEVELS.length - 1;
  const campaignWon = won && !hasNext;
  useEffect(() => {
    eventSender.current.announce({status: state.status, campaignWon, playerName},
      event => connection.current?.send(event) ?? false);
  }, [state.status, campaignWon, playerName]);
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
          <h1>Do<span className="title-right">om</span>{' '}<span className="title-web">W<span className="title-right">eb</span></span></h1>
          <h2>Courez. Ripostez. Trouvez le sas.</h2>
          <p>Trois grands secteurs, jusqu’à 96 mètres de côté. Traqueurs, colosses et sentinelles occupent les passages. Chaque mission renouvelle le plan, les rencontres et les soins.</p>
          <form className="start-form" onSubmit={event => { event.preventDefault(); start(); }}>
            <label htmlFor="player-name">Pseudo</label>
            <input id="player-name" name="player" autoFocus autoComplete="nickname" value={playerName}
              onChange={event => setPlayerName(event.target.value)} required aria-invalid={Boolean(playerError)}
              aria-describedby={playerError ? 'player-error' : 'player-hint'} />
            <p id="player-hint" className="hint">De 1 à 24 caractères. Votre pseudo sera utilisé pour le score.</p>
            {playerError && <p id="player-error" role="alert" className="error">{playerError}</p>}
            <button className="primary play-button" disabled={unavailable}>Jouer <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
          </form>
          <p className="mission-facts">64 / 80 / 96 m <span>·</span> 4 types d’ennemis <span>·</span> Tirs illimités</p>
          {unavailable && <p role="alert" className="error">{state.error}</p>}
        </div>
        <LevelMap preview />
      </section>
      <section className="score-panel" aria-label="Classement">
        <div className="list-heading"><h2>Tableau des survivants <span>Top 10</span></h2><button className="utility" disabled={loading} onClick={() => loadScores()}>Recharger</button></div>
        {loading ? <p className="empty-score">Lecture du classement…</p> : scores.length === 0 ? <p className="empty-score">Aucun score pour le moment. Terminez une partie pour inscrire votre nom.</p> : <ol>{scores.map(score => <li key={score.id}><span>{score.player}</span><strong>{score.points}<small> PTS</small></strong></li>)}</ol>}
        {error && <p role="alert" className="error">{error}</p>}
        <details className="players-disclosure" open={showPlayerStats} onToggle={event => setShowPlayerStats(event.currentTarget.open)}>
          <summary>Statistiques par joueur</summary>
          {showPlayerStats && <PlayerStats request={request} revision={scores} />}
        </details>
      </section>
      <EventFeed events={events} status={connectionStatus} />
      <p className="score-disclaimer">Classement de démonstration. Scores déclarés par les joueurs.</p>
    </div>}

    <section className="game-screen" aria-label="Le jeu" hidden={home}>
      <div className="viewport">
        <canvas ref={canvas} width="640" height="400" tabIndex={home || !playing ? -1 : 0} aria-label="Niveau en vue à la première personne. Cliquez pour reprendre." aria-describedby="commands" />
        {playing && <>
          <svg className="crosshair" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v5m0 8v5M3 12h5m8 0h5" /></svg>
          <img className="weapon-view" src="/art/pistol-view.png" alt="" />
        </>}
        {playing && <div className="mission-strip">
          <span>Score <strong>{scorePoints(state)}</strong></span>
          <span>{state.player ? `${Math.round(Math.hypot(level.exit.x - state.player.x, level.exit.z - state.player.z))} m du sas` : 'Rejoignez le sas'}</span>
          <span><kbd>M</kbd> {state.mapVisible ? 'Fermer le plan' : 'Plan'}</span>
        </div>}
        {playing && state.mapVisible && <aside className="tactical-map" aria-label="Plan tactique">
          <LevelMap level={level} player={state.player} enemies={state.enemies} medkits={state.medkits} />
        </aside>}
        <DamageOverlay health={state.playerHealth ?? 3} active={!home && (playing || lost)} />
        {playing && <EventFeed events={events} status={connectionStatus} floating />}
      </div>
      <p className="game-message" role="status">{campaignWon ? 'Victoire : tous les niveaux sont terminés !' : won ? 'Niveau terminé : la suite vous attend.' : lost ? 'Défaite : vous n’avez plus de vie.' : playing ? (state.lastShot || 'Objectif : rejoignez le sas vert. Maj pour courir.') : 'En pause : la partie vous attend.'}</p>
      <Hud state={state} />
      {!playing && !home && <section className={`game-overlay${won ? ' has-won' : ''}`} aria-label={won || lost ? 'Fin de partie' : 'Menu de pause'}>
        <div className="menu-panel">
          <h2>{campaignWon ? 'Victoire' : won ? 'Niveau terminé' : lost ? 'Défaite' : unavailable ? 'Signal perdu' : 'En pause'}</h2>
          <p>{campaignWon ? 'Vous avez traversé les trois niveaux. Enregistrez votre score.' : won ? `${level.name} est derrière vous. Vos PV sont conservés pour la suite.` : lost ? 'Le secteur a eu raison de vous. Retentez votre chance.' : 'Soufflez un instant. Le secteur peut attendre.'}</p>
          <p className="mission-seed">Mission {state.seed} · {state.kills ?? 0} éliminations · {scorePoints(state)} points</p>
          <p className="menu-tips">Maintenez le tir. Maj pour courir. M pour le plan. Les trousses rendent un PV.</p>
          {state.error && <p role="alert" className="error">{state.error}</p>}
          {(campaignWon || lost) && <ScoreForm points={scorePoints(state)} playerName={playerName} request={request} onSaved={loadScores} />}
          <div className="menu-actions">
            {!won && !lost && !unavailable && <button className="primary" autoFocus onClick={() => game.current.resume()}>Reprendre</button>}
            {won && hasNext && <button className="primary" autoFocus onClick={goNext}>Niveau suivant</button>}
            {!unavailable && <button className={campaignWon || lost ? 'primary' : 'secondary'} autoFocus={campaignWon || lost} onClick={() => start(state.seed)}>{won || lost ? 'Rejouer' : 'Recommencer'}</button>}
            <button className="secondary" onClick={goHome}>Retour à l’accueil</button>
          </div>
          <EventFeed events={events} status={connectionStatus} />
        </div>
      </section>}
    </section>

    <div id="commands" className="commands" hidden={!home && playing}>
      <span><kbd>ZQSD</kbd> / <kbd>WASD</kbd> Bouger</span><span><kbd>Maj</kbd> Courir</span><span><kbd>Souris</kbd> Viser</span><span><kbd>Clic</kbd> / <kbd>Espace</kbd> Maintenir le tir</span><span><kbd>M</kbd> Plan</span><span><kbd>Échap</kbd> Pause</span>
    </div>
  </main>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
