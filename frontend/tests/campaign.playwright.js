// À exécuter avec browser_run_code_unsafe, filename: frontend/tests/campaign.playwright.js.
// La capture souris est simulée. Pour tester rapidement les menus, les sorties sont
// élargies autour du spawn uniquement dans les modules du navigateur, puis restaurées.
// Les captures précèdent ces mutations ; les déplacements et collisions restent couverts par les tests unitaires.
async (page) => {
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  const button = async name => {
    await page.getByRole('button', {name, exact: true}).focus();
    await page.keyboard.press('Enter');
  };
  const health = () => page.locator('#player-health').evaluate(el => el.value);
  const pause = () => page.evaluate(() => document.exitPointerLock());
  const expectedGuards = [3, 4, 5];
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
    const levels = await page.evaluate(async () => {
      const {LEVELS} = await import('/src/levels/index.js');
      return LEVELS.map(level => ({name: level.name, spawn: {...level.spawn}, exit: {...level.exit}}));
    });
    check(levels.length === 3, 'la campagne doit proposer trois niveaux');
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
    const checkLevel = async index => {
      await page.waitForFunction(({name, number}) => {
        const cell = document.querySelector('.mission-cell');
        return cell?.querySelector('strong')?.textContent.trim() === name &&
          cell.querySelector('small')?.textContent.replace(/\s/g, '') === `Niveau${number}/3`;
      }, {name: levels[index].name, number: index + 1}, {timeout: 5000});
      await page.getByRole('button', {name: /^Pause/}).waitFor();
      const guards = (await page.locator('.enemy-cell > strong').textContent()).replace(/\s/g, '');
      check(guards === `${expectedGuards[index]}/${expectedGuards[index]}`, 'gardes non réinitialisés');
    };

    await button('Jouer');
    let carriedHealth = 3;
    for (let index = 0; index < levels.length; index++) {
      await checkLevel(index);
      check(await health() === carriedHealth, 'les PV ont changé pendant le passage au niveau suivant');
      check(await page.getByLabel('Pseudo', {exact: true}).count() === 0, 'formulaire présent pendant un niveau');
      await page.waitForTimeout(400);
      await page.screenshot({path: `.playwright-mcp/sprint7-level${index + 1}.png`});

      if (index === 0) {
        // Le déplacement déclenche réellement la détection du garde à droite ; aucun PV n’est injecté.
        await page.keyboard.down('KeyD');
        await page.waitForTimeout(1200);
        await page.keyboard.up('KeyD');
        await page.waitForFunction(() => document.querySelector('#player-health').value === 2, null, {timeout: 10000});
        carriedHealth = 2;
      }
      await pause();
      await page.getByRole('button', {name: 'Reprendre', exact: true}).waitFor();
      await page.evaluate(async index => {
        const {LEVELS} = await import('/src/levels/index.js');
        const level = LEVELS[index];
        Object.assign(level.exit, {x: level.spawn.x, z: level.spawn.z, width: level.size * 2, depth: level.size * 2});
      }, index);
      await button('Reprendre');
      const final = index === levels.length - 1;
      await page.getByRole('heading', {name: final ? 'Victoire' : 'Niveau terminé', exact: true}).waitFor({timeout: 5000});
      check(await health() === carriedHealth, 'fin de niveau sans conservation des PV');
      check(await page.evaluate(() => document.pointerLockElement === null), 'souris retenue après un niveau');
      await page.evaluate(async ({index, exit}) => {
        const {LEVELS} = await import('/src/levels/index.js');
        Object.assign(LEVELS[index].exit, exit);
      }, {index, exit: levels[index].exit});
      if (final) {
        check(await page.getByLabel('Pseudo', {exact: true}).isVisible(), 'formulaire absent après la campagne');
        check(await page.getByRole('button', {name: 'Niveau suivant', exact: true}).count() === 0, 'niveau supplémentaire après la finale');
      } else {
        check(await page.getByLabel('Pseudo', {exact: true}).count() === 0, 'formulaire prématuré avant le dernier niveau');
        await button('Niveau suivant');
      }
    }

    await button('Rejouer');
    await checkLevel(0);
    check(await health() === 3, 'Rejouer ne restaure pas les PV');
    check(await page.getByLabel('Pseudo', {exact: true}).count() === 0, 'ancien formulaire conservé après Rejouer');
    check(posts === 0, 'la navigation a tenté d’enregistrer un score');
    return {levels: levels.map(level => level.name), guards: expectedGuards, intermediateMenus: 2, carriedHealth, enemyReset: true, finalScoreForm: true, replay: true, scorePosts: posts, exitSimulation: 'browser-only enlarged exits; each exit restored after victory, reload restores modules'};
  } finally {
    await page.keyboard.up('KeyD');
    await page.reload();
    await page.unroute('**/scores/**', protectScores);
  }
}
