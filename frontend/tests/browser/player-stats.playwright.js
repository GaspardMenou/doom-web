// Scénarios d'interface avec réponses API de test. Aucune donnée n'est enregistrée.
async (page) => {
  const pattern = '**/players/';
  const check = (ok, message) => { if (!ok) throw new Error(message); };
  let mode = 'loading';
  let release;
  const rows = [
    {player: 'Ada', games_played: 2, total_points: 150, average_points: 75},
    {player: 'PseudoDeVingtQuatreLettres', games_played: 3, total_points: 170, average_points: 170 / 3},
  ];
  await page.route(pattern, async route => {
    if (mode === 'loading') await new Promise(resolve => { release = resolve; });
    if (mode === 'error') return route.fulfill({status: 503, json: {detail: 'Test unavailable'}});
    if (mode === 'invalid') return route.fulfill({json: [{player: 'Ada'}]});
    return route.fulfill({json: mode === 'empty' ? [] : rows});
  });
  const eventsModule = '**/src/api/events.js';
  await page.route(eventsModule, route => route.fulfill({contentType: 'application/javascript', body: `
    export * from '/src/api/events.js?legacy-game-fixture';
    export function connectEvents(_, {onStatus}) {
      onStatus('closed'); return {send: () => false, close() {}};
    }
  `}));
  try {
    await page.goto('http://127.0.0.1:5175');
    await page.getByText('Statistiques par joueur', {exact: true}).click();
    await page.getByText('Lecture des statistiques…', {exact: true}).waitFor();
    mode = 'success';
    for (let retry = 0; !release && retry < 100; retry++) await page.waitForTimeout(20);
    check(Boolean(release), 'GET /players/ absent');
    release();
    await page.getByRole('table').waitFor();
    check((await page.getByRole('row', {name: /Ada/}).textContent()).includes('215075'), 'statistiques Ada incorrectes');
    check((await page.getByRole('table').textContent()).includes('56,7'), 'moyenne non formatée en français');
    await page.screenshot({path: '.playwright-mcp/sprint7-stats-desktop.png', fullPage: true});
    await page.setViewportSize({width: 390, height: 844});
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'table déborde sur mobile');
    await page.screenshot({path: '.playwright-mcp/sprint7-stats-mobile.png', fullPage: true});
    for (const next of ['empty', 'error', 'invalid', 'success']) {
      mode = next;
      await page.getByRole('button', {name: 'Recharger les statistiques', exact: true}).click();
      if (next === 'empty') await page.getByText('Aucune statistique pour le moment.', {exact: true}).waitFor();
      else if (next === 'error') await page.getByRole('alert').filter({hasText: '503'}).waitFor();
      else if (next === 'invalid') await page.getByRole('alert').filter({hasText: 'illisibles'}).waitFor();
      else await page.getByRole('table').waitFor();
    }
    return {loading: true, ready: true, empty: true, httpError: true, invalidPayload: true, retry: true, mobileOverflow: false, apiResponses: 'test fixtures only'};
  } finally {
    if (release) release();
    await page.unroute(pattern);
    await page.unroute(eventsModule);
    await page.setViewportSize({width: 1440, height: 1000});
    await page.reload();
  }
}
