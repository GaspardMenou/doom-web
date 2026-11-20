// Scène et première carte réelles. Seule la capture native de souris est simulée.
// Les transitions rapides des trois secteurs sont vérifiées séparément dans campaign.playwright.js.
async (page) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const button = async name => {
    await page.getByRole('button', {name, exact: true}).focus();
    await page.keyboard.press('Enter');
  };
  const health = () => page.locator('#player-health').evaluate(el => el.value);
  const pause = () => page.evaluate(() => document.exitPointerLock());
  const position = () => page.locator('.tactical-map [data-player-x]').evaluate(el =>
    ({x: Number(el.dataset.playerX), z: Number(el.dataset.playerZ)}));
  const map = async () => {
    await page.keyboard.press('KeyM');
    await page.locator('.tactical-map [data-player-x]').waitFor();
  };
  const complete = () => page.getByRole('heading', {name: 'Niveau terminé', exact: true}).isVisible();
  const walkTo = async point => {
    for (const axis of ['x', 'z']) {
      for (let pulse = 0; pulse < 50; pulse++) {
        if (await complete()) return;
        const delta = point[axis] - (await position())[axis];
        if (Math.abs(delta) < 0.3) break;
        const key = axis === 'x' ? delta > 0 ? 'KeyD' : 'KeyA' : delta > 0 ? 'KeyS' : 'KeyW';
        await page.keyboard.down(key);
        await page.waitForTimeout(Math.min(500, Math.max(20, (Math.abs(delta) - 0.1) / 12 * 1000)));
        await page.keyboard.up(key);
        if (await complete()) return;
        await page.waitForTimeout(170);
        check(pulse < 49, `trajet bloqué sur ${axis} vers ${point[axis]}`);
      }
    }
  };
  const plan = () => page.locator('.tactical-map .map-divider, .tactical-map .map-exit').evaluateAll(elements =>
    elements.map(el => ['x', 'y', 'width', 'height'].map(name => Number(el.getAttribute(name)))));
  const yellowPixels = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => {
    const source = document.querySelector('canvas');
    const copy = document.createElement('canvas');
    copy.width = source.width; copy.height = source.height;
    const context = copy.getContext('2d');
    context.drawImage(source, 0, 0);
    const data = context.getImageData(0, 0, copy.width, copy.height).data;
    let count = 0;
    for (let p = 0; p < data.length; p += 4) if (data[p] > 230 && data[p + 1] > 180 && data[p + 2] < 170) count++;
    resolve(count);
  })));
  let posts = 0;
  const protectScores = async route => {
    if (route.request().method() === 'POST') { posts++; await route.abort(); }
    else await route.continue();
  };

  await page.route('**/scores/**', protectScores);
  try {
    await page.goto('http://127.0.0.1:5175/?seed=12345');
    await page.setViewportSize({width: 1440, height: 1000});
    await page.getByRole('button', {name: 'Jouer', exact: true}).waitFor();
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
    check(!await page.locator('canvas').isVisible(), 'scène visible à l’accueil');
    await button('Jouer');
    await page.getByRole('button', {name: /^Pause/}).waitFor({timeout: 5000});
    check(await health() === 3, 'Jouer ne restaure pas les PV');
    await page.waitForFunction(() => {
      const image = document.querySelector('.weapon-view');
      return image?.complete && image.naturalWidth > 0;
    }, null, {timeout: 5000});
    for (const size of [{width: 1024, height: 768}, {width: 1440, height: 1000}]) {
      await page.setViewportSize(size);
      await page.waitForFunction(() => {
        const canvas = document.querySelector('canvas');
        const box = canvas.getBoundingClientRect();
        const ratio = Math.min(devicePixelRatio || 1, 2);
        return canvas.width === Math.round(box.width * ratio) && canvas.height === Math.round(box.height * ratio);
      }, null, {timeout: 5000});
    }
    await page.waitForTimeout(300);
    const before = await yellowPixels();
    await page.keyboard.press('Space');
    const during = await yellowPixels();
    await page.waitForTimeout(160);
    const after = await yellowPixels();
    check(during > before && after === before, 'tracé absent ou persistant après le tir');
    check((await page.locator('.enemy-cell > strong').textContent()).replace(/\s/g, '') === '12/12', 'un tir traverse le dépôt central');

    // Mesurer les deux vitesses sur le même départ, avec la même graine.
    await map();
    const start = await position();
    const initialPlan = await plan();
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(180);
    const walked = start.z - (await position()).z;
    await pause();
    await page.getByRole('button', {name: 'Reprendre', exact: true}).waitFor();
    check((await page.locator('.mission-seed').textContent()).includes('12345'), 'la graine de l’URL est ignorée');
    await page.screenshot({path: '.playwright-mcp/sprint8-pause.png'});
    await button('Recommencer');
    await map();
    const restarted = await position();
    check(Math.abs(restarted.x - start.x) < 0.01 && Math.abs(restarted.z - start.z) < 0.01, 'Recommencer ne restaure pas le départ');
    check(JSON.stringify(await plan()) === JSON.stringify(initialPlan), 'Recommencer change les murs ou le sas de la graine');
    await page.keyboard.down('Shift');
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(400);
    await page.keyboard.up('KeyW');
    await page.keyboard.up('Shift');
    await page.waitForTimeout(180);
    const sprinted = restarted.z - (await position()).z;
    check(walked > 2 && sprinted > walked * 1.2, `Maj ne produit pas une course plus rapide : marche ${walked}, course ${sprinted}`);
    await pause();
    await button('Reprendre');
    check(await health() === 3, 'Reprendre modifie les PV');
    await pause();
    await button('Retour à l’accueil');
    check(!await page.locator('canvas').isVisible(), 'scène visible au retour à l’accueil');

    // Parcours réel du secteur seedé : périphérie dégagée, puis trajet vers le sas choisi par la graine.
    const route = await page.evaluate(async () => {
      const {LEVELS} = await import('/src/game/levels/index.js');
      const {populateLevel} = await import('/src/game/mission.js');
      const {routesFromSpawn} = await import('/tests/fixtures/routes.js');
      const level = populateLevel(LEVELS[0], 12345);
      const edge = level.size / 2 - 1.5;
      const corner = {x: edge, z: -edge};
      const path = routesFromSpawn({...level, spawn: corner}, 0.7)(level.exit);
      if (!path) throw new Error('aucun chemin du passage périphérique au sas');
      const turns = path.filter((point, index) => index === 0 || index === path.length - 1 ||
        (point.x - path[index - 1].x) * (path[index + 1].z - point.z) !==
        (point.z - path[index - 1].z) * (path[index + 1].x - point.x));
      return {points: [{x: edge, z: level.spawn.z}, corner, ...turns],
        plan: [...level.walls.map(wall => [wall.x - wall.width / 2, wall.z - wall.depth / 2, wall.width, wall.depth]),
          [level.exit.x - level.exit.width / 2, level.exit.z - level.exit.depth / 2, level.exit.width, level.exit.depth]]};
    });
    await button('Jouer');
    await map();
    check(JSON.stringify(await plan()) === JSON.stringify(route.plan), 'le plan affiché ne suit pas les murs et le sas seedés');
    await page.keyboard.down('Shift');
    try {
      for (const point of route.points) {
        if (await complete()) break;
        await walkTo(point);
      }
    } finally { await page.keyboard.up('Shift'); }
    await page.getByRole('heading', {name: 'Niveau terminé', exact: true}).waitFor({timeout: 5000});
    check(await page.getByLabel('Pseudo', {exact: true}).count() === 0, 'formulaire avant le dernier secteur');
    check(await page.getByRole('button', {name: 'Niveau suivant', exact: true}).isVisible(), 'suite de campagne absente');
    check(await page.evaluate(() => document.pointerLockElement === null), 'souris retenue après la sortie');
    await page.screenshot({path: '.playwright-mcp/sprint8-level-complete.png'});
    await page.setViewportSize({width: 390, height: 844});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'débordement mobile');
    await page.screenshot({path: '.playwright-mcp/sprint8-level-complete-mobile.png'});
    check(posts === 0, 'le parcours a tenté d’enregistrer un score');
    return {home: true, pause: true, resume: true, seededRestart: true, map: true,
      movementMeters: {walked, sprinted}, realLargeLevelExit: true, responsiveCanvas: true,
      seededGeometry: true, routeTurns: route.points.length,
      tracerPixels: {before, during, after}, scorePosts: posts};
  } catch (error) {
    await page.screenshot({path: '.playwright-mcp/sprint8-menus-error.png'});
    throw error;
  } finally {
    for (const key of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Shift', 'Space']) await page.keyboard.up(key);
    await page.setViewportSize({width: 1440, height: 1000});
    await page.reload();
    await page.unroute('**/scores/**', protectScores);
  }
}
