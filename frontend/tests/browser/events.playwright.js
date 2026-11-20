// Deux onglets et WebSockets natifs contre une API temporaire sur 8002.
// Seuls la capture souris, les niveaux de fin rapide et les requêtes de score sont contrôlés.
async page => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const first = await page.context().newPage();
  const second = await page.context().newPage();
  const sent = [];
  const saved = [];
  const button = async (tab, name) => {
    await tab.getByRole('button', {name, exact: true}).focus();
    await tab.keyboard.press('Enter');
  };
  const count = tab => tab.getByRole('log').locator('li').count();
  try {
    for (const tab of [first, second]) {
      await tab.setViewportSize({width: 1440, height: 1000});
      tab.on('websocket', socket => {
        if (!socket.url().endsWith('/ws/events')) return;
        socket.on('framesent', ({payload}) => { try { sent.push(JSON.parse(String(payload))); } catch {} });
      });
      await tab.addInitScript(() => {
        const NativeSocket = window.WebSocket;
        window.testEventSockets = [];
        window.WebSocket = class extends NativeSocket {
          constructor(...args) {
            super(...args);
            if (String(args[0]).endsWith('/ws/events')) window.testEventSockets.push(this);
          }
        };
      });
      await tab.route('**/scores/**', async route => {
        if (route.request().method() === 'GET') return route.fulfill({json: []});
        const data = route.request().postDataJSON();
        saved.push(data);
        return route.fulfill({status: 201, json: {id: 1, player_id: 1, ...data}});
      });
      await tab.goto('http://127.0.0.1:5176/?seed=12345');
      await tab.getByText('En direct', {exact: true}).waitFor();
    }
    check(await count(first) === 0 && await count(second) === 0, 'historique inattendu à l’ouverture');
    await first.bringToFront();
    await first.getByLabel('Pseudo', {exact: true}).fill('   ');
    await button(first, 'Jouer');
    await first.getByRole('alert').filter({hasText: '1 à 24'}).waitFor();
    check(!await first.locator('canvas').isVisible(), 'une partie commence avec un pseudo blanc');
    await first.getByLabel('Pseudo', {exact: true}).fill('A'.repeat(25));
    await button(first, 'Jouer');
    check(!await first.locator('canvas').isVisible(), 'une partie commence avec un pseudo trop long');

    await first.evaluate(async () => {
      const {LEVELS} = await import('/src/game/levels/index.js');
      Object.assign(LEVELS[0], {fixedLayout: true, size: 40, spawn: {x: 0, z: 15, angle: 0}, walls: [],
        enemies: [{id: 'event-guard', type: 'guard', x: 0, z: 14}], medkits: [],
        exit: {x: 17, z: -17, width: 3, depth: 3}});
      let locked = null;
      const canvas = document.querySelector('canvas');
      Object.defineProperty(document, 'pointerLockElement', {configurable: true, get: () => locked});
      canvas.requestPointerLock = async () => { locked = canvas; document.dispatchEvent(new Event('pointerlockchange')); };
      document.exitPointerLock = () => { locked = null; document.dispatchEvent(new Event('pointerlockchange')); };
    });
    await first.getByLabel('Pseudo', {exact: true}).fill('  Ada  ');
    await button(first, 'Jouer');
    await first.getByRole('heading', {name: 'Défaite', exact: true}).waitFor({timeout: 15000});
    for (const tab of [first, second]) await tab.getByRole('log').getByText('Ada est mort(e).', {exact: true}).waitFor();
    await first.waitForTimeout(350);
    check(await count(first) === 1 && await count(second) === 1, 'la mort apparaît plusieurs fois');
    check(sent.filter(event => event.type === 'death' && event.player === 'Ada').length === 1, 'la mort est envoyée plusieurs fois');
    const result = first.getByRole('region', {name: 'Résultat de la partie', exact: true});
    check(await result.locator('input').count() === 0, 'le score redemande un pseudo');
    check((await result.textContent()).includes('Joueur : Ada'), 'le score ne réutilise pas le pseudo nettoyé');
    await button(first, 'Enregistrer le score');
    await first.getByText('Score enregistré.', {exact: true}).waitFor();
    check(saved.length === 1 && saved[0].player === 'Ada' && typeof saved[0].player === 'string', 'le score utilise la position au lieu du pseudo');

    await first.evaluate(async () => {
      const {LEVELS} = await import('/src/game/levels/index.js');
      for (const level of LEVELS) {
        level.fixedLayout = true;
        level.enemies = [];
        level.medkits = [];
        level.walls = [];
        level.exit = {x: level.spawn.x, z: level.spawn.z, width: 4, depth: 4};
      }
    });
    await button(first, 'Rejouer');
    for (let sector = 0; sector < 2; sector++) {
      await first.getByRole('heading', {name: 'Niveau terminé', exact: true}).waitFor();
      check(sent.filter(event => event.type === 'victory').length === 0, 'une sortie intermédiaire diffuse une victoire');
      await button(first, 'Niveau suivant');
    }
    await first.getByRole('heading', {name: 'Victoire', exact: true}).waitFor();
    for (const tab of [first, second]) await tab.getByRole('log').getByText('Ada a gagné la partie.', {exact: true}).waitFor();
    await first.waitForTimeout(350);
    check(sent.filter(event => event.type === 'victory' && event.player === 'Ada').length === 1, 'la victoire est envoyée plusieurs fois');
    check(await count(first) === 2 && await count(second) === 2, 'l’écho du joueur local est doublé');
    await first.screenshot({path: '.playwright-mcp/events-victory.png'});

    // Le serveur diffuse réellement 55 événements ; l’interface ne conserve que les 50 derniers.
    await second.evaluate(async () => {
      const socket = window.testEventSockets.find(socket => socket.readyState === WebSocket.OPEN);
      for (let index = 0; index < 55; index++) socket.send(JSON.stringify({type: 'death', player: `Joueur${index}`}));
      socket.send(JSON.stringify({type: 'victory', player: '<b>Ada</b>'}));
    });
    for (const tab of [first, second]) {
      await tab.getByRole('log').getByText('<b>Ada</b> a gagné la partie.', {exact: true}).waitFor();
      check(await count(tab) === 50, 'le fil ne conserve pas exactement 50 messages');
      check((await tab.getByRole('log').locator('li').first().textContent()) === 'Joueur6 est mort(e).', 'les événements anciens ne sont pas retirés');
      check(await tab.getByRole('log').locator('b').count() === 0, 'le pseudo est interprété comme du HTML');
      check(await tab.getByRole('log').evaluate(el => el.scrollTop + el.clientHeight >= el.scrollHeight - 1),
        'le fil masque les événements les plus récents');
    }
    await second.setViewportSize({width: 390, height: 844});
    check(await second.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'le fil déborde sur mobile');
    await second.screenshot({path: '.playwright-mcp/events-home-mobile.png', fullPage: true});
    await second.reload();
    await second.getByText('En direct', {exact: true}).waitFor();
    check(await count(second) === 0, 'la page recrée un historique après rechargement');

    const socketsBefore = await second.evaluate(() => window.testEventSockets.length);
    await second.evaluate(() => window.testEventSockets.find(socket => socket.readyState === WebSocket.OPEN).send('{"type":"invalid","player":"Ada"}'));
    await second.getByText('Fil déconnecté', {exact: true}).waitFor();
    await second.waitForTimeout(350);
    check(await second.evaluate(() => window.testEventSockets.length) === socketsBefore, 'le fil se reconnecte automatiquement');
    await second.bringToFront();
    await second.evaluate(() => {
      let locked = null;
      const canvas = document.querySelector('canvas');
      Object.defineProperty(document, 'pointerLockElement', {configurable: true, get: () => locked});
      canvas.requestPointerLock = async () => { locked = canvas; document.dispatchEvent(new Event('pointerlockchange')); };
    });
    await second.getByLabel('Pseudo', {exact: true}).fill('Lin');
    await button(second, 'Jouer');
    await second.getByRole('button', {name: /^Pause/}).waitFor();
    check(await second.locator('canvas').isVisible(), 'la déconnexion bloque le jeu');
    await second.screenshot({path: '.playwright-mcp/events-offline-game.png'});
    return {twoNativeTabs: true, uniqueDeath: true, finalVictoryOnly: true, senderEchoOnce: true,
      pseudoBeforeGame: true, reusedForScore: true, last50: true, safeReactText: true,
      noHistory: true, close1008: true, noReconnect: true, offlinePlayable: true,
      scoreRequests: 'interceptées ; aucune écriture en base'};
  } finally {
    await first.close();
    await second.close();
  }
}
