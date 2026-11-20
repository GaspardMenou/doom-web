// Le premier secteur seedé est capturé avant les fixtures de transitions.
// Blessure dans une arène contrôlée, puis sorties élargies installées avant de charger chaque secteur.
// Toute mutation disparaît au rechargement final ; scores et fil WebSocket isolés du backend.
async (page) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const button = async name => {
    await page.getByRole('button', {name, exact: true}).focus();
    await page.keyboard.press('Enter');
  };
  const health = () => page.locator('#player-health').evaluate(el => el.value);
  const pause = () => page.evaluate(() => document.exitPointerLock());
  const map = async () => {
    await page.keyboard.press('KeyM');
    await page.locator('.tactical-map [data-player-x]').waitFor();
  };
  const expectedGuards = [12, 18, 24];
  let posts = 0;
  const protectScores = async route => {
    if (route.request().method() === 'POST') { posts++; await route.abort(); }
    else await route.continue();
  };
  await page.route('**/scores/**', protectScores);
  const eventsModule = '**/src/api/events.js';
  await page.route(eventsModule, route => route.fulfill({contentType: 'application/javascript', body: `
    export * from '/src/api/events.js?legacy-game-fixture';
    export function connectEvents(_, {onStatus}) {
      onStatus('closed'); return {send: () => false, close() {}};
    }
  `}));
  try {
    await page.goto('http://127.0.0.1:5175/?seed=12345');
    await page.setViewportSize({width: 1440, height: 1000});
    await page.getByRole('button', {name: 'Jouer', exact: true}).waitFor();
    await page.locator('#player-name').fill('Test campagne');
    const levels = await page.evaluate(async () => {
      const {LEVELS} = await import('/src/game/levels/index.js');
      return structuredClone(LEVELS);
    });
    check(levels.length === 3 && levels.map(level => level.size).join(',') === '64,80,96', 'les grandes cartes sont absentes');
    await page.evaluate(() => {
      let locked = null;
      const canvas = document.querySelector('canvas');
      Object.defineProperty(document, 'pointerLockElement', {configurable: true, get: () => locked});
      canvas.requestPointerLock = async () => {
        if (canvas.getBoundingClientRect().width === 0 || document.activeElement !== canvas) throw new Error('Canvas caché ou sans focus');
        locked = canvas;
        document.dispatchEvent(new Event('pointerlockchange'));
      };
      document.exitPointerLock = () => { locked = null; document.dispatchEvent(new Event('pointerlockchange')); };
    });
    const checkLevel = async (index, count = expectedGuards[index]) => {
      await page.waitForFunction(({name, number}) => {
        const cell = document.querySelector('.mission-cell');
        return cell?.querySelector('strong')?.textContent.trim() === name &&
          cell.querySelector('small')?.textContent.replace(/\s/g, '') === 'Niveau' + number + '/3';
      }, {name: levels[index].name, number: index + 1}, {timeout: 5000});
      check((await page.locator('.enemy-cell > strong').textContent()).replace(/\s/g, '') === count + '/' + count, 'hostiles non réinitialisés');
    };

    // Capturer le vrai premier secteur avant de remplacer ses données pour le test de blessure.
    await button('Jouer');
    await checkLevel(0);
    await map();
    await page.waitForTimeout(400);
    await page.screenshot({path: '.playwright-mcp/sprint8-level1.png'});
    check(await health() === 3, 'la vraie carte commence sous attaque');
    await pause();
    await button('Retour à l’accueil');
    const guard = await page.evaluate(async () => {
      const {LEVELS} = await import('/src/game/levels/index.js');
      const {newGame} = await import('/src/game/game.js');
      Object.assign(LEVELS[0], {fixedLayout: true, size: 40, height: 4.5, spawn: {x: 0, z: 15, angle: 0}, walls: [],
        enemies: [{id: 'browser-guard', type: 'guard', x: 0, z: -5}], medkits: [],
        exit: {x: 0, z: 18, width: 3, depth: 3}});
      for (const level of LEVELS.slice(1)) {
        level.fixedLayout = true;
        level.exit = {x: level.spawn.x, z: level.spawn.z, width: level.size * 2, depth: level.size * 2};
      }
      const initial = newGame(0, 12345);
      const enemy = initial.enemies[0];
      LEVELS[0].spawn.angle = Math.atan2(-(enemy.x - initial.player.x), -(enemy.z - initial.player.z));
      return enemy;
    });
    await button('Jouer');
    await checkLevel(0, 1);
    await map();
    await page.keyboard.down('KeyW');
    await page.waitForFunction(guard => {
      const marker = document.querySelector('.tactical-map [data-player-x]');
      return marker && Math.hypot(Number(marker.dataset.playerX) - guard.x, Number(marker.dataset.playerZ) - guard.z) <= 12;
    }, guard, {timeout: 6000});
    await page.keyboard.up('KeyW');
    await page.waitForFunction(() => document.querySelector('#player-health').value === 2, null, {timeout: 8000});
    await pause();

    // Reculer vers le sas déjà présent : le plan de la partie n’est jamais muté après sa création.
    await button('Reprendre');
    await page.keyboard.down('Shift');
    await page.keyboard.down('KeyS');
    try {
      await page.getByRole('heading', {name: 'Niveau terminé', exact: true}).waitFor({timeout: 5000});
    } finally {
      await page.keyboard.up('KeyS');
      await page.keyboard.up('Shift');
    }

    for (let index = 0; index < levels.length; index++) {
      if (index > 0) {
        await checkLevel(index);
        check(await health() === 2, 'les PV ont changé au passage au secteur suivant');
      }
      const final = index === levels.length - 1;
      await page.getByRole('heading', {name: final ? 'Victoire' : 'Niveau terminé', exact: true}).waitFor({timeout: 5000});
      check(await health() === 2, 'la fin du secteur modifie les PV');
      check(await page.evaluate(() => document.pointerLockElement === null), 'souris retenue après un secteur');
      if (index === 0) await page.evaluate(async original => {
        const {LEVELS} = await import('/src/game/levels/index.js');
        Object.assign(LEVELS[0], original);
        delete LEVELS[0].fixedLayout;
      }, levels[0]);
      if (final) {
        const result = page.locator('section[aria-label="Résultat de la partie"]');
        check(await result.isVisible(), 'formulaire absent après la campagne');
        check((await result.textContent()).includes('Test campagne'), 'le score ne réutilise pas le pseudo de départ');
        check(await result.locator('input').count() === 0, 'le score redemande le pseudo');
        check(await page.getByRole('button', {name: 'Niveau suivant', exact: true}).count() === 0, 'secteur supplémentaire après la finale');
        check((await result.textContent()).includes('2700 points'), 'bonus de victoire/PV incorrects');
        await page.screenshot({path: '.playwright-mcp/sprint8-campaign-victory.png'});
      } else {
        check(await page.locator('section[aria-label="Résultat de la partie"]').count() === 0, 'formulaire avant le dernier secteur');
        await button('Niveau suivant');
      }
    }
    await button('Rejouer');
    await checkLevel(0);
    check(await health() === 3, 'Rejouer ne restaure pas les PV');
    check(Number(await page.locator('.mission-strip strong').textContent()) === 0, 'Rejouer ne remet pas les points à zéro');
    check(await page.locator('section[aria-label="Résultat de la partie"]').count() === 0, 'ancien formulaire après Rejouer');
    check(posts === 0, 'la navigation a tenté d’enregistrer un score');
    return {levels: levels.map(level => level.name), sizes: levels.map(level => level.size), guards: expectedGuards,
      intermediateMenus: 2, carriedHealth: 2, victoryPoints: 2700, replay: true, scorePosts: posts,
      simulation: 'capture souris, fil WebSocket neutralisé et géométries contrôlées pour les transitions ; sorties élargies avant chargement, premier secteur seedé capturé séparément'};
  } catch (error) {
    await page.screenshot({path: '.playwright-mcp/sprint8-campaign-error.png'});
    throw error;
  } finally {
    for (const key of ['KeyW', 'KeyS', 'Shift']) await page.keyboard.up(key);
    await page.unroute('**/scores/**', protectScores);
    await page.unroute(eventsModule);
    await page.reload();
  }
}
