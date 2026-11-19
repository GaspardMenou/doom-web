// À exécuter avec browser_run_code_unsafe, filename: frontend/tests/menus.playwright.js.
// Seule la capture native de la souris est simulée ; le moteur et les scènes sont réels.
// Le premier niveau est parcouru réellement ; campaign.playwright.js teste les trois transitions avec des sorties simulées.
async (page) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const button = async name => {
    await page.getByRole('button', {name, exact: true}).focus();
    await page.keyboard.press('Enter');
  };
  const health = () => page.locator('#player-health').evaluate(el => el.value);
  const pause = () => page.evaluate(() => document.exitPointerLock());
  const walk = async (key, ms) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
  };
  const yellowPixels = () => page.evaluate(() => {
    const source = document.querySelector('canvas');
    return new Promise(resolve => requestAnimationFrame(() => {
      const copy = document.createElement('canvas');
      copy.width = source.width; copy.height = source.height;
      const context = copy.getContext('2d');
      context.drawImage(source, 0, 0);
      const data = context.getImageData(0, 0, copy.width, copy.height).data;
      let count = 0;
      for (let p = 0; p < data.length; p += 4) if (data[p] > 230 && data[p + 1] > 180 && data[p + 2] < 170) count++;
      resolve(count);
    }));
  });

  await page.goto('http://127.0.0.1:5175');
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
  try {
    // 1. L'accueil attend le joueur.
    check(!await page.locator('canvas').isVisible(), 'scène visible avant Jouer');
    check(await page.evaluate(() => document.activeElement.textContent.startsWith('Jouer')), 'Jouer sans focus');
    await button('Jouer');
    await page.getByRole('button', {name: /^Pause/}).waitFor({timeout: 5000});
    check(await health() === 3, 'Jouer ne restaure pas les PV');
    check(await page.locator('.weapon-view').evaluate(el => el.complete && el.naturalWidth > 0), 'sprite absent');

    // 2. Le Canvas remplit la zone de jeu et s'adapte à la fenêtre.
    for (const size of [{width: 1024, height: 768}, {width: 1440, height: 1000}]) {
      await page.setViewportSize(size);
      await page.waitForFunction(() => {
        const canvas = document.querySelector('canvas');
        const box = canvas.getBoundingClientRect();
        const ratio = Math.min(devicePixelRatio || 1, 2);
        return canvas.width === Math.round(box.width * ratio) && canvas.height === Math.round(box.height * ratio);
      }, null, {timeout: 5000});
    }
    const before = await yellowPixels();
    await page.keyboard.press('Space');
    const during = await yellowPixels();
    await page.waitForTimeout(150);
    const after = await yellowPixels();
    check(during > before && after === before, 'tracé absent ou restant après le tir');
    check((await page.locator('.enemy-cell > strong').textContent()).replace(/\s/g, '') === '3/3', 'tir traverse le bloc central');
    await page.screenshot({path: '.playwright-mcp/sprint6-game-desktop.png'});

    // 3. Le menu permet de reprendre ; guards.playwright.js vérifie l'arrêt des animations.
    await pause();
    await page.getByRole('button', {name: 'Reprendre', exact: true}).waitFor();
    await page.screenshot({path: '.playwright-mcp/sprint6-pause-desktop.png'});
    await button('Reprendre');
    check(await health() === 3, 'Reprendre change les PV');
    await pause();

    // 4. Retour à l'accueil, puis Jouer : nouvelle partie.
    await button('Retour à l’accueil');
    check(!await page.locator('canvas').isVisible(), 'scène visible au retour à l’accueil');
    await button('Jouer');
    check(await health() === 3, 'nouvelle partie sans restauration');
    await walk('KeyD', 1500);
    await page.keyboard.down('KeyW');
    await page.getByRole('heading', {name: 'Niveau terminé', exact: true}).waitFor({timeout: 5000});
    await page.keyboard.up('KeyW');
    check(await page.getByLabel('Pseudo', {exact: true}).count() === 0, 'formulaire avant le dernier niveau');
    check(await page.getByRole('button', {name: 'Niveau suivant', exact: true}).isVisible(), 'suite de campagne absente');
    check(await page.evaluate(() => document.pointerLockElement === null), 'souris retenue après victoire');
    await page.screenshot({path: '.playwright-mcp/sprint6-victory-desktop.png'});
    await page.setViewportSize({width: 390, height: 844});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'débordement mobile');
    await page.screenshot({path: '.playwright-mcp/sprint6-victory-mobile.png'});
    await page.setViewportSize({width: 1440, height: 1000});
    await button('Retour à l’accueil');
    return {home: true, pause: true, resume: true, levelComplete: true, responsiveCanvas: true, tracerPixels: {before, during, after}};
  } finally {
    await page.keyboard.up('KeyW'); await page.keyboard.up('KeyD');
    await page.setViewportSize({width: 1440, height: 1000});
    await page.reload();
  }
}
