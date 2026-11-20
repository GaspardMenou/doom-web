// Combat réel dans une arène contrôlée de 40 m, injectée uniquement dans les modules du navigateur.
// Les positions sont celles de newGame(seed), donc le placement aléatoire reste réellement exécuté.
async (page) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const button = async name => {
    await page.getByRole('button', {name, exact: true}).focus();
    await page.keyboard.press('Enter');
  };
  const health = () => page.locator('#player-health').evaluate(el => el.value);
  const guards = async () => (await page.locator('.enemy-cell > strong').textContent()).replace(/\s/g, '');
  const position = () => page.locator('.tactical-map [data-player-x]').evaluate(el =>
    ({x: Number(el.dataset.playerX), z: Number(el.dataset.playerZ)}));
  const rotate = (from, to) => page.evaluate(movementX => document.dispatchEvent(
    new MouseEvent('mousemove', {movementX, movementY: 0, bubbles: true})), (from - to) / 0.002);
  let posts = 0;
  const protectScores = async route => {
    if (route.request().method() === 'POST') { posts++; await route.abort(); }
    else await route.continue();
  };
  const fixture = async type => {
    await page.goto('http://127.0.0.1:5175/?seed=12345');
    await page.setViewportSize({width: 1440, height: 1000});
    await page.getByRole('button', {name: 'Jouer', exact: true}).waitFor();
    await page.locator('#player-name').fill('Test gardes');
    const initial = await page.evaluate(async type => {
      const {LEVELS} = await import('/src/game/levels/index.js');
      const {newGame, PLAYER_MAX_HEALTH} = await import('/src/game/game.js');
      const {ENEMY_TYPES} = await import('/src/game/enemyTypes.js');
      Object.assign(LEVELS[0], {fixedLayout: true, size: 40, height: 4.5, spawn: {x: 0, z: 15, angle: 0}, walls: [],
        enemies: [{id: 'browser-enemy', type, x: 0, z: -5}],
        medkits: type === 'guard' ? [{id: 'browser-medkit', x: 5, z: 15}] : [],
        exit: {x: 17, z: -17, width: 3, depth: 3}});
      const predicted = newGame(0, 12345);
      const enemy = predicted.enemies[0];
      const angle = Math.atan2(-(enemy.x - predicted.player.x), -(enemy.z - predicted.player.z));
      LEVELS[0].spawn.angle = angle;
      let locked = null;
      const canvas = document.querySelector('canvas');
      Object.defineProperty(document, 'pointerLockElement', {configurable: true, get: () => locked});
      canvas.requestPointerLock = async () => {
        if (canvas.getBoundingClientRect().width === 0 || document.activeElement !== canvas) throw new Error('Canvas caché ou sans focus');
        locked = canvas;
        document.dispatchEvent(new Event('pointerlockchange'));
      };
      document.exitPointerLock = () => { locked = null; document.dispatchEvent(new Event('pointerlockchange')); };
      return {enemy, medkit: predicted.medkits[0], angle, spec: ENEMY_TYPES[type], maxHealth: PLAYER_MAX_HEALTH};
    }, type);
    await button('Jouer');
    await page.getByRole('button', {name: /^Pause/}).waitFor();
    await page.keyboard.press('KeyM');
    await page.locator('.tactical-map [data-player-x]').waitFor();
    return initial;
  };
  const approach = async (enemy, distance) => {
    await page.keyboard.down('KeyW');
    try {
      await page.waitForFunction(({enemy, distance}) => {
        const marker = document.querySelector('.tactical-map [data-player-x]');
        return marker && Math.hypot(Number(marker.dataset.playerX) - enemy.x,
          Number(marker.dataset.playerZ) - enemy.z) <= distance;
      }, {enemy, distance}, {timeout: 6000});
    } finally { await page.keyboard.up('KeyW'); }
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
    const guard = await fixture('guard');
    await page.waitForTimeout(1100);
    check(await health() === guard.maxHealth && await guards() === '1/1', 'le garde attaque avant la détection');
    await page.screenshot({path: '.playwright-mcp/sprint8-guard-idle.png'});
    await approach(guard.enemy, guard.spec.detectRange - 2);
    const walkA = await page.locator('canvas').screenshot({path: '.playwright-mcp/sprint8-guard-walk-a.png'});
    await page.waitForTimeout(180);
    const walkB = await page.locator('canvas').screenshot({path: '.playwright-mcp/sprint8-guard-walk-b.png'});
    check(!walkA.equals(walkB), 'la poursuite ne change pas le rendu');
    check(await health() === guard.maxHealth, 'le garde attaque avant son arrivée au contact');

    await page.evaluate(() => document.exitPointerLock());
    await page.getByRole('button', {name: 'Reprendre', exact: true}).waitFor();
    const paused = await page.locator('canvas').screenshot();
    await page.waitForTimeout(180);
    check(paused.equals(await page.locator('canvas').screenshot()), 'le monde continue à avancer en pause');
    await button('Reprendre');
    await page.waitForFunction(expected => document.querySelector('#player-health').value === expected,
      guard.maxHealth - 1, {timeout: 8000});
    await page.screenshot({path: '.playwright-mcp/sprint8-guard-attack.png'});
    for (let hit = 0; hit < guard.enemy.health; hit++) {
      await page.keyboard.press('Space');
      if (hit + 1 < guard.enemy.health) await page.waitForTimeout(180);
    }
    await page.waitForFunction(() => document.querySelector('.enemy-cell > strong').textContent.replace(/\s/g, '') === '0/1', null, {timeout: 2500});
    check(Number(await page.locator('.mission-strip strong').textContent()) === guard.spec.score, 'le garde ne rapporte pas ses points');
    const healthAfterKill = await health();
    await page.waitForTimeout(guard.spec.attackDelay * 1000 + 100);
    check(await health() === healthAfterKill, 'le garde mort continue à attaquer');

    // Rejoindre la vraie trousse tirée par la graine, sans injecter de vie dans la partie.
    const player = await position();
    const healingAngle = Math.atan2(-(guard.medkit.x - player.x), -(guard.medkit.z - player.z));
    await rotate(guard.angle, healingAngle);
    await page.keyboard.down('KeyW');
    await page.waitForFunction(expected => document.querySelector('#player-health').value === expected,
      Math.min(guard.maxHealth, healthAfterKill + 1), {timeout: 6000});
    await page.keyboard.up('KeyW');
    check(await page.locator('.tactical-map .map-health').count() === 0, 'la trousse ramassée reste sur le plan');
    await page.screenshot({path: '.playwright-mcp/sprint8-healed.png'});

    // Un deuxième petit scénario rend visible le nouveau tir adverse et vérifie le tir maintenu.
    const gunner = await fixture('gunner');
    await approach(gunner.enemy, gunner.spec.attackRange);
    await page.waitForTimeout(120);
    await page.screenshot({path: '.playwright-mcp/sprint8-gunner-projectile.png'});
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyD');
    await page.waitForTimeout(200);
    check(await health() === gunner.maxHealth, 'le projectile dirigé vers l’ancienne position n’a pas pu être esquivé');
    const current = await position();
    const target = await page.locator('.tactical-map .map-enemy').evaluate(el =>
      ({x: Number(el.getAttribute('cx')), z: Number(el.getAttribute('cy'))}));
    await rotate(gunner.angle, Math.atan2(-(target.x - current.x), -(target.z - current.z)));
    await page.keyboard.down('Space');
    await page.waitForFunction(() => document.querySelector('.enemy-cell > strong').textContent.replace(/\s/g, '') === '0/1', null, {timeout: 2500});
    await page.keyboard.up('Space');
    check(Number(await page.locator('.mission-strip strong').textContent()) === gunner.spec.score, 'la sentinelle ne rapporte pas ses points');
    await page.screenshot({path: '.playwright-mcp/sprint8-gunner-defeated.png'});
    check(posts === 0, 'le scénario a tenté d’enregistrer un score');
    return {idle: true, seededFixture: true, walking: true, pause: true, contactDamage: true,
      guardKillPoints: guard.spec.score, medkit: true, dodgedProjectile: true, heldFire: true, gunnerKillPoints: gunner.spec.score,
      scorePosts: posts, simulation: 'capture souris, niveau contrôlé et fil WebSocket neutralisé uniquement dans le navigateur'};
  } catch (error) {
    await page.screenshot({path: '.playwright-mcp/sprint8-guards-error.png'});
    throw error;
  } finally {
    for (const key of ['KeyW', 'KeyD', 'Space']) await page.keyboard.up(key);
    await page.unroute('**/scores/**', protectScores);
    await page.unroute(eventsModule);
    await page.reload();
  }
}
