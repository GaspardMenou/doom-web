// À exécuter avec browser_run_code_unsafe, filename: frontend/tests/guards.playwright.js.
// Seule la capture native de souris est simulée ; niveaux, gardes, tirs et rendu restent réels.
async (page) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const button = async name => {
    await page.getByRole('button', {name, exact: true}).focus();
    await page.keyboard.press('Enter');
  };
  const health = () => page.locator('#player-health').evaluate(element => element.value);
  const guards = async () => (await page.locator('.enemy-cell > strong').textContent()).replace(/\s/g, '');
  const canvas = () => page.locator('canvas');
  let posts = 0;
  const protectScores = async route => {
    if (route.request().method() === 'POST') {
      posts++;
      await route.abort();
    } else await route.continue();
  };

  await page.route('**/scores/**', protectScores);
  try {
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

    await button('Jouer');
    await page.getByRole('button', {name: /^Pause/}).waitFor();
    await page.waitForFunction(() => performance.getEntriesByType('resource').some(entry =>
      entry.name.includes('/art/enemy-guard-sheet.png') && entry.responseEnd > 0), null, {timeout: 5000});
    await page.waitForTimeout(1200);
    check(await health() === 3 && await guards() === '3/3', 'les gardes attaquent dès le spawn');
    const idleA = await canvas().screenshot();
    await page.waitForTimeout(180);
    const idleB = await canvas().screenshot();
    check(idleA.equals(idleB), 'les gardes ne restent pas au repos à distance');
    await page.screenshot({path: '.playwright-mcp/sprint7-guards-idle.png'});

    await page.evaluate(() => document.exitPointerLock());
    await page.getByRole('button', {name: 'Reprendre', exact: true}).waitFor();
    const paused = await canvas().screenshot();
    await page.waitForTimeout(1200);
    check(await health() === 3 && paused.equals(await canvas().screenshot()), 'le combat continue en pause');
    await button('Reprendre');

    // Le déplacement réel déclenche le garde à droite, sans toucher aux données du niveau.
    await page.keyboard.down('KeyD');
    await page.waitForTimeout(1200);
    await page.keyboard.up('KeyD');
    await page.evaluate(() => document.dispatchEvent(new MouseEvent('mousemove', {movementX: 70, movementY: 0, bubbles: true})));
    await page.waitForTimeout(300);
    const walkA = await canvas().screenshot({path: '.playwright-mcp/sprint7-guard-walk-a.png'});
    await page.waitForTimeout(180);
    const walkB = await canvas().screenshot({path: '.playwright-mcp/sprint7-guard-walk-b.png'});
    check(!walkA.equals(walkB), 'la poursuite ne change pas le rendu');
    check(await health() === 3, 'le garde attaque avant son arrivée au contact');

    await page.evaluate(() => document.exitPointerLock());
    await page.getByRole('button', {name: 'Reprendre', exact: true}).waitFor();
    const pausedWalk = await canvas().screenshot();
    await page.waitForTimeout(180);
    check(pausedWalk.equals(await canvas().screenshot()), 'l’animation de marche continue en pause');
    await button('Reprendre');

    await page.waitForFunction(() => document.querySelector('#player-health').value === 2, null, {timeout: 7000});
    await page.screenshot({path: '.playwright-mcp/sprint7-guard-attack.png'});
    check(await health() === 2, 'plusieurs dégâts avant de pouvoir réagir');
    await page.keyboard.press('Space');
    check((await page.locator('.game-message').textContent()).includes('Touché'), 'le premier tir manque le garde');
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('.enemy-cell > strong').textContent.replace(/\s/g, '') === '2/3', null, {timeout: 3000});
    const healthAfterKill = await health();
    await page.waitForTimeout(1200);
    check(await health() === healthAfterKill, 'le garde éliminé continue à attaquer');
    check(await guards() === '2/3', 'les tirs éliminent plusieurs gardes');
    check(posts === 0, 'le parcours a tenté un POST de score');
    await page.screenshot({path: '.playwright-mcp/sprint7-guard-defeated.png'});

    return {
      idle: true,
      animationSheetLoaded: true,
      pause: true,
      animationPaused: true,
      aggroAfterApproach: true,
      walkSnapshotsDiffer: true,
      contactDamage: true,
      healthAfterKill,
      twoShotsKillOneGuard: true,
      deadGuardDoesNotAttack: true,
      scorePosts: posts,
      pointerLock: 'capture native simulée uniquement',
    };
  } finally {
    await page.keyboard.up('KeyD');
    await page.keyboard.up('Space');
    await page.reload();
    await page.unroute('**/scores/**', protectScores);
  }
}
