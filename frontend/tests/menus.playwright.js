// À exécuter avec browser_run_code_unsafe, filename: frontend/tests/menus.playwright.js.
// Seule la capture native de la souris est simulée ; le moteur et les scènes sont réels.
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
  const dimensions = () => page.locator('canvas').evaluate(el => {
    const box = el.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    return {width: el.width, height: el.height, expectedWidth: Math.round(box.width * ratio), expectedHeight: Math.round(box.height * ratio)};
  });
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
      await page.waitForTimeout(100);
      const d = await dimensions();
      check(d.width === d.expectedWidth && d.height === d.expectedHeight, 'Canvas étiré après resize');
    }
    const before = await yellowPixels();
    await page.keyboard.press('Space');
    const during = await yellowPixels();
    await page.waitForTimeout(150);
    const after = await yellowPixels();
    check(during > before && after === before, 'tracé absent ou restant après le tir');
    check(await page.locator('.enemy-cell > strong').textContent() === '2 PV', 'tir traverse la cloison');
    await page.screenshot({path: '.playwright-mcp/sprint6-game-desktop.png'});

    // 3. La pause fige la scène ; Reprendre conserve la vie.
    await page.waitForFunction(() => document.querySelector('#player-health').value === 2, null, {timeout: 16000});
    await pause();
    await page.getByRole('button', {name: 'Reprendre', exact: true}).waitFor();
    const still = await page.locator('canvas').screenshot();
    await page.waitForTimeout(1200);
    check(await health() === 2, 'dégâts pendant la pause');
    check(still.equals(await page.locator('canvas').screenshot()), 'scène qui avance en pause');
    await page.screenshot({path: '.playwright-mcp/sprint6-pause-desktop.png'});
    await button('Reprendre');
    check(await health() === 2, 'Reprendre remet la vie à zéro');
    await pause();

    // 4. Retour à l'accueil, puis Jouer : nouvelle partie.
    await button('Retour à l’accueil');
    await page.waitForTimeout(1100);
    check(!await page.locator('canvas').isVisible() && await health() === 2, 'accueil continue le combat');
    await button('Jouer');
    check(await health() === 3, 'nouvelle partie sans restauration');
    await walk('KeyD', 1200);
    await walk('KeyW', 1850);
    await page.keyboard.down('KeyA');
    await page.getByRole('heading', {name: 'Victoire', exact: true}).waitFor({timeout: 4000});
    await page.keyboard.up('KeyA');
    check(await page.getByLabel('Pseudo', {exact: true}).isVisible(), 'formulaire absent après victoire');
    check(await page.evaluate(() => document.pointerLockElement === null), 'souris retenue après victoire');
    await page.screenshot({path: '.playwright-mcp/sprint6-victory-desktop.png'});
    await page.setViewportSize({width: 390, height: 844});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'débordement mobile');
    await page.screenshot({path: '.playwright-mcp/sprint6-victory-mobile.png'});
    await page.setViewportSize({width: 1440, height: 1000});
    await button('Rejouer');
    check(await health() === 3 && await page.getByLabel('Pseudo', {exact: true}).count() === 0, 'Rejouer conserve ancienne partie');
    await pause();
    await button('Retour à l’accueil');
    return {home: true, pause: true, resume: true, newGame: true, victory: true, replay: true, responsiveCanvas: true, tracerPixels: {before, during, after}};
  } finally {
    await page.keyboard.up('KeyA'); await page.keyboard.up('KeyW'); await page.keyboard.up('KeyD');
    await page.setViewportSize({width: 1440, height: 1000});
    await page.reload();
  }
}
