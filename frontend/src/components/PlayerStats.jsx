import React, {useEffect, useRef, useState} from 'react';
import {readPlayerStats} from '../api/playerStats.js';

const average = new Intl.NumberFormat('fr-FR', {maximumFractionDigits: 1});

export function PlayerStats({request, revision}) {
  const pending = useRef(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setLoading(true);
    try {
      const data = await request('/players/', {signal: controller.signal});
      setRows(readPlayerStats(data));
      setError('');
    } catch (error) {
      if (error.name !== 'AbortError') setError(error.message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    load();
    return () => pending.current?.abort();
  }, [request, revision]);

  return <section className="player-stats" aria-label="Statistiques des joueurs">
    <div className="list-heading"><p>Les résultats de chaque joueur.</p><button className="utility" onClick={load} disabled={loading}>Recharger les statistiques</button></div>
    {loading ? <p role="status">Lecture des statistiques…</p> : error ? <p role="alert" className="error">{error}</p> : rows.length === 0 ? <p>Aucune statistique pour le moment.</p> : <table>
      <caption>Parties et points par pseudo</caption>
      <thead><tr><th scope="col">Joueur</th><th scope="col">Parties</th><th scope="col">Total</th><th scope="col"><abbr title="Moyenne">Moy.</abbr></th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.player}><th scope="row">{row.player}</th><td>{row.games_played}</td><td>{row.total_points}</td><td>{average.format(row.average_points)}</td></tr>)}</tbody>
    </table>}
  </section>;
}
