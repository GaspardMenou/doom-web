// Vraies missions : seule la capture native de souris est simulée.
async page => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const plans = [];
  const scores = route => route.request().method() === 'GET' ? route.fulfill({json: []}) : route.abort();
  const position = () => page.locator('.tactical-map [data-player-x]').evaluate(el =>
    ({x: Number(el.dataset.playerX), z: Number(el.dataset.playerZ)}));
  const key = (type, character, code) => page.locator('canvas').evaluate((canvas, event) =>
    canvas.dispatchEvent(new KeyboardEvent(event.type, {...event, bubbles: true, cancelable: true})),
    {type, key: character, code});
  await page.route('**/scores/**', scores);
  try {
    for (const [index, seed] of [12345, 54321, 12345].entries()) {
      await page.goto(`http://127.0.0.1:5175/?seed=${seed}`);
      await page.setViewportSize({width: 1440, height: 1000});
      await page.getByRole('button', {name: 'Jouer', exact: true}).waitFor();
      const expected = await page.evaluate(async seed => {
        const {newGame} = await import('/src/game/game.js');
        const {level, player} = newGame(0, seed);
        let locked = null;
        const canvas = document.querySelector('canvas');
        Object.defineProperty(document, 'pointerLockElement', {configurable: true, get: () => locked});
        canvas.requestPointerLock = async () => { locked = canvas; document.dispatchEvent(new Event('pointerlockchange')); };
        document.exitPointerLock = () => { locked = null; document.dispatchEvent(new Event('pointerlockchange')); };
        return {plan: [...level.walls.map(wall => [wall.x - wall.width / 2, wall.z - wall.depth / 2, wall.width, wall.depth]),
          [level.exit.x - level.exit.width / 2, level.exit.z - level.exit.depth / 2, level.exit.width, level.exit.depth]],
          distance: Math.round(Math.hypot(level.exit.x - player.x, level.exit.z - player.z))};
      }, seed);
      await page.getByRole('button', {name: 'Jouer', exact: true}).focus();
      await page.keyboard.press('Enter');
      await page.keyboard.press('KeyM');
      await page.locator('.tactical-map').waitFor();
      const plan = await page.locator('.tactical-map .map-divider, .tactical-map .map-exit').evaluateAll(elements =>
        elements.map(el => ['x', 'y', 'width', 'height'].map(name => Number(el.getAttribute(name)))));
      check(JSON.stringify(plan) === JSON.stringify(expected.plan), 'le plan affiche une autre géométrie que la mission');
      check((await page.locator('.mission-strip').textContent()).includes(`${expected.distance} m du sas`), 'distance vers le mauvais sas');
      plans.push(plan);
      if (index === 0) {
        const start = await position();
        await key('keydown', 'z', 'KeyZ');
        await page.waitForTimeout(350);
        await key('keyup', 'Z', 'KeyZ');
        await page.waitForTimeout(180);
        const forward = await position();
        check(start.z - forward.z > 2, 'Z en AZERTY ne fait pas avancer');
        await key('keydown', 'q', 'KeyQ');
        await page.waitForTimeout(300);
        await key('keyup', 'q', 'KeyQ');
        await page.waitForTimeout(180);
        const left = await position();
        check(forward.x - left.x > 1.5, 'Q en AZERTY ne fait pas aller à gauche');
        await page.waitForTimeout(180);
        check(JSON.stringify(await position()) === JSON.stringify(left), 'une touche reste coincée après son relâchement');
      }
      if (index < 2) await page.screenshot({path: `.playwright-mcp/seed-${seed}-map.png`});
      if (index === 1) {
        await page.setViewportSize({width: 390, height: 844});
        await page.screenshot({path: '.playwright-mcp/seed-map-mobile.png'});
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'le plan déborde sur mobile');
      }
    }
    check(JSON.stringify(plans[0].slice(0, -1)) !== JSON.stringify(plans[1].slice(0, -1)), 'deux seeds gardent les mêmes murs');
    check(JSON.stringify(plans[0].at(-1)) !== JSON.stringify(plans[1].at(-1)), 'deux seeds gardent le même sas');
    check(JSON.stringify(plans[0]) === JSON.stringify(plans[2]), 'recharger la seed ne reproduit pas le plan');
    return {seeds: [12345, 54321, 12345], differentWalls: true, differentExit: true,
      reproducible: true, accurateMapAndDistance: true, azertyLettersAndRelease: true, mobile: true};
  } finally {
    await page.setViewportSize({width: 1440, height: 1000});
    await page.unroute('**/scores/**', scores);
    await page.reload();
  }
}
