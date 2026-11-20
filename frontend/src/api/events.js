export function normalizePlayerName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || Array.from(name).length > 24) throw new Error('Saisissez un pseudo de 1 à 24 caractères.');
  return name;
}

export function eventsUrl(apiUrl, pageUrl = globalThis.location?.href) {
  if (typeof apiUrl !== 'string' || !apiUrl) throw new Error('URL API manquante.');
  const url = new URL(apiUrl, pageUrl);
  if (!['http:', 'https:', 'ws:', 'wss:'].includes(url.protocol)) throw new Error('URL API incompatible avec les WebSockets.');
  url.protocol = ['https:', 'wss:'].includes(url.protocol) ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/ws/events`;
  url.search = '';
  url.hash = '';
  return url.href;
}

function readEvent(value) {
  if (!value || !['death', 'victory'].includes(value.type)) throw new Error('Événement invalide.');
  return {type: value.type, player: normalizePlayerName(value.player)};
}

export function connectEvents(apiUrl, {onEvent, onStatus}, WebSocketClass = globalThis.WebSocket, pageUrl = globalThis.location?.href) {
  let active = true;
  let socket;
  onStatus('connecting');
  try {
    socket = new WebSocketClass(eventsUrl(apiUrl, pageUrl));
    socket.onopen = () => { if (active) onStatus('open'); };
    socket.onerror = () => { if (active) onStatus('error'); };
    socket.onclose = () => { if (active) onStatus('closed'); };
    socket.onmessage = ({data}) => {
      if (!active) return;
      let event;
      try { event = readEvent(JSON.parse(data)); } catch { return; }
      onEvent(event);
    };
  } catch {
    onStatus('error');
  }
  return {
    send(event) {
      if (!active || socket?.readyState !== 1) return false;
      try {
        socket.send(JSON.stringify(readEvent(event)));
        return true;
      } catch {
        onStatus('error');
        return false;
      }
    },
    close() {
      if (!active) return;
      active = false;
      if (!socket) return;
      socket.onopen = socket.onmessage = socket.onerror = socket.onclose = null;
      if (socket.readyState === 0 || socket.readyState === 1) {
        try { socket.close(); } catch { /* Le démontage ne doit pas interrompre le jeu. */ }
      }
    },
  };
}
