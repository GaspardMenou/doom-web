import React, {useEffect, useRef} from 'react';

const connectionLabels = {
  connecting: 'Connexion…', open: 'En direct', closed: 'Fil déconnecté', error: 'Fil indisponible',
};

export function EventFeed({events, status, floating = false}) {
  const log = useRef(null);
  useEffect(() => { log.current.scrollTop = log.current.scrollHeight; }, [events]);
  return <section className={`event-feed${floating ? ' is-floating' : ''}`} aria-label="Événements des joueurs">
    <div className="list-heading"><h2>Sur le terrain</h2><span className="hint" role="status">{connectionLabels[status]}</span></div>
    <ol ref={log} role="log" aria-label="Événements des joueurs" aria-live="polite" aria-relevant="additions" aria-atomic="false">
      {events.map(event => <li key={event.id}>
        <strong>{event.player}</strong>{event.type === 'death' ? ' est mort(e).' : ' a gagné la partie.'}
      </li>)}
    </ol>
    {events.length === 0 && <p className="hint">Aucun événement reçu.</p>}
  </section>;
}
