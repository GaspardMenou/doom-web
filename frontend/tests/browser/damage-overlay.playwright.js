// Dégâts et rendu réels ; seule la capture native de souris est simulée dans cette petite arène.
async (page) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const button = async name => {
    await page.getByRole('button', {name, exact: true}).focus();
    await page.keyboard.press('Enter');
  };
  const opacity = () => page.locator('.damage-overlay').evaluate(el => Number(getComputedStyle(el).opacity));
  const faded = () => page.waitForFunction(() => {
    const overlay = document.querySelector('.damage-overlay');
    return overlay && Number(getComputedStyle(overlay).opacity) === 0;
  }, null, {timeout: 1200});
  const damaged = health => page.waitForFunction(health =>
    document.querySelector('#player-health')?.value === health, health, {timeout: 7000});
  const scores = route => route.request().method() === 'GET'
    ? route.fulfill({json: []}) : route.abort();

  await page.route('**/scores/**', scores);
  try {
    await page.goto('http://127.0.0.1:5175/?seed=12345');
    await page.setViewportSize({width: 1440, height: 1000});
    await page.getByRole('button', {name: 'Jouer', exact: true}).waitFor();
    await page.evaluate(async () => {
      const {LEVELS} = await import('/src/game/levels/index.js');
      Object.assign(LEVELS[0], {size: 40, spawn: {x: 0, z: 2, angle: 0}, walls: [],
        enemies: [{id: 'overlay-guard', type: 'guard', x: 0, z: -2}], medkits: [],
        exit: {x: 17, z: -17, width: 3, depth: 3}});
      let locked = null;
      const canvas = document.querySelector('canvas');
      Object.defineProperty(document, 'pointerLockElement', {configurable: true, get: () => locked});
      canvas.requestPointerLock = async () => {
        locked = canvas;
        document.dispatchEvent(new Event('pointerlockchange'));
      };
      document.exitPointerLock = () => { locked = null; document.dispatchEvent(new Event('pointerlockchange')); };
    });
    await button('Jouer');
    await damaged(2);
    check(await page.locator('.damage-overlay.is-visible').count() === 1,
      'une perte de PV doit afficher l’image de sang');
    await page.waitForFunction(() => {
      const image = document.querySelector('.damage-overlay');
      return image?.complete && image.naturalWidth > 0;
    });
    check(await opacity() > 0.7, 'le sang ne devient pas visible immédiatement');
    check(await page.locator('.damage-overlay').evaluate(el => getComputedStyle(el).pointerEvents) === 'none',
      'le sang intercepte les clics');
    // Le tir publie un autre état React : il ne doit pas effacer le retour des dégâts.
    await page.keyboard.press('Space');
    check(await page.locator('.damage-overlay.is-visible').count() === 1, 'un tir efface le sang prématurément');
    await page.screenshot({path: '.playwright-mcp/damage-overlay-hit.png'});
    await faded();

    await damaged(1);
    check(await page.locator('.damage-overlay.is-visible').count() === 1, 'le coup suivant ne relance pas le sang');
    await page.evaluate(() => document.exitPointerLock());
    await page.getByRole('heading', {name: 'En pause', exact: true}).waitFor();
    await faded();
    await button('Reprendre');
    check(await opacity() === 0, 'Reprendre rejoue un ancien dégât');

    await page.evaluate(() => document.exitPointerLock());
    await page.emulateMedia({reducedMotion: 'reduce'});
    await button('Recommencer');
    check(await opacity() === 0, 'Recommencer conserve le sang');
    await damaged(2);
    check(await opacity() > 0 && await opacity() <= 0.45, 'le mode mouvement réduit doit atténuer le sang');
    await faded();
    await damaged(0);
    await page.getByRole('heading', {name: 'Défaite', exact: true}).waitFor();
    check(await page.locator('.damage-overlay.is-visible').count() === 1, 'le coup fatal ne montre pas le sang');
    await faded();
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await button('Rejouer');
    check(await opacity() === 0, 'Rejouer conserve le sang après la défaite');
    await page.setViewportSize({width: 390, height: 844});
    await damaged(2);
    await page.screenshot({path: '.playwright-mcp/damage-overlay-mobile.png'});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'le sang déborde sur mobile');
    return {damage: true, shotDoesNotClear: true, fade: true, repeatedHit: true,
      pauseResume: true, restart: true, reducedMotion: true, fatalHit: true, replay: true, mobile: true};
  } finally {
    await page.keyboard.up('Space');
    await page.emulateMedia({reducedMotion: 'no-preference'});
    await page.setViewportSize({width: 1440, height: 1000});
    await page.reload();
    await page.unroute('**/scores/**', scores);
  }
}
