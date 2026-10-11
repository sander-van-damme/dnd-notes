import { expect, test } from '@playwright/test';
function wav() {
  const samples = 16000 * 3,
    b = Buffer.alloc(44 + samples * 2);
  b.write('RIFF');
  b.writeUInt32LE(b.length - 8, 4);
  b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20);
  b.writeUInt16LE(1, 22);
  b.writeUInt32LE(16000, 24);
  b.writeUInt32LE(32000, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write('data', 36);
  b.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    b.writeInt16LE(
      Math.round(Math.sin((i * 2 * Math.PI * 220) / 16000) * 4000),
      44 + i * 2,
    );
  return b;
}
test('campagne, bewerken, scène afronden, herladen en offline sessienotities', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(
    page.getByText('Wat wordt jullie volgende avontuur?'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Begin je eerste sessie' }).click();
  await page.getByLabel('Naam van de campagne').fill('De groene vallei');
  await page.getByLabel('Naam van de sessie').fill('De gesloten poort');
  await page.getByRole('button', { name: 'Sessie aanmaken' }).click();
  await expect(
    page.getByRole('heading', { name: 'De gesloten poort' }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Zelf een notitie toevoegen' })
    .click();
  await page.getByLabel('Notitie bewerken').fill('Eldrin bewaakt de poort.');
  await page
    .getByRole('button', { name: 'Scène afronden', exact: true })
    .click();
  await expect(page.getByText('Door jou bewerkt')).toBeVisible();
  await expect(
    page.getByText('Alles lokaal opgeslagen', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Notitie bewerken')).toHaveValue(
    'Eldrin bewaakt de poort.',
  );
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect(
    page.getByText('Alles lokaal opgeslagen', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await context.setOffline(true);
  await expect(
    page.getByText('Alles lokaal opgeslagen', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Notitie bewerken')).toHaveValue(
    'Eldrin bewaakt de poort.',
  );
  await page.getByLabel('Notitie bewerken').fill('Eldrin opent de poort.');
  await expect(
    page.getByText('Alles lokaal opgeslagen', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Notitie bewerken')).toHaveValue(
    'Eldrin opent de poort.',
  );
  expect(errors).toEqual([]);
});
test('woordenboek bevestigt kandidaten expliciet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Campagnes', exact: true }).click();
  await page.getByRole('button', { name: 'Nieuwe campagne' }).click();
  await page.getByLabel('Naam van de campagne').fill('Ravenveld');
  await page.getByRole('button', { name: 'Campagne aanmaken' }).click();
  await page
    .getByLabel('Vorig sessieverslag')
    .fill('We ontmoetten Eldrin bij de rivier. Eldrin droeg een sleutel.');
  await page.getByRole('button', { name: 'Bevestigen', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Eldrin verwijderen' }),
  ).toBeVisible();
  await expect(
    page.getByText('Alles lokaal opgeslagen', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Campagnes', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Eldrin verwijderen' }),
  ).toBeVisible();
});
test('mobiele lege toestand past zonder horizontale scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: 'Jouw avonturenboek.' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: '/tmp/dnd-mobile.png', fullPage: true });
});
test('testpipeline en kwaliteitsgate met gecontroleerde workerstub; geen audio-opslag', async ({
  page,
}) => {
  await page.route('**/sw.js', (route) => route.abort());
  await page.route(/\/assets\/inference\.worker-.*\.js$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      headers: { 'Cross-Origin-Embedder-Policy': 'credentialless' },
      body: `self.onmessage=({data})=>{if(data.type==='load')self.postMessage({id:data.id,result:true});else if(data.type==='process')self.postMessage({id:data.id,result:{rawText:'FACT: Eldrin bewaakt de poort.',transcript:'',totalMs:20,inputTokens:12,outputTokens:10}});};`,
    }),
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Lokale modellen', exact: true })
    .click();
  await page.getByLabel('Uitvoering').selectOption('wasm');
  await page.getByRole('button', { name: 'Laden uit lokale cache' }).click();
  await expect(
    page.getByText('Model geladen. Voer een korte audiotest'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Naar testmodus' }).click();
  await page.getByLabel('Audiofragment kiezen').setInputFiles({
    name: 'synthetisch.wav',
    mimeType: 'audio/wav',
    buffer: wav(),
  });
  await page.getByRole('button', { name: 'Start test', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Laatste modelantwoord' }),
  ).toBeVisible();
  await page.getByLabel('Taakstrategie').selectOption('direct');
  await expect(
    page.getByRole('button', {
      name: 'Ik heb de notities gecontroleerd',
      exact: false,
    }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Start test', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Ik heb de notities gecontroleerd',
      exact: false,
    })
    .click();
  await expect(page.getByText('Configuratie bevestigd')).toBeVisible();
  const stored = await page.evaluate(
    async () =>
      new Promise<string>((resolve) => {
        const r = indexedDB.open('dnd-notulist');
        r.onsuccess = () => {
          const db = r.result;
          const q = db.transaction('state').objectStore('state').get('current');
          q.onsuccess = () => {
            resolve(JSON.stringify(q.result));
            db.close();
          };
        };
      }),
  );
  expect(stored).not.toContain('Eldrin');
  expect(stored).not.toContain('pcm');
  expect(stored).not.toContain('synthetisch.wav');
  expect(JSON.parse(stored).runs[0].chunks).toBeGreaterThan(0);
  await page
    .getByRole('button', { name: 'Avonturenboek', exact: true })
    .click();
  await page.getByRole('button', { name: 'Begin je eerste sessie' }).click();
  await page.getByLabel('Naam van de campagne').fill('Microfoontest');
  await page.getByLabel('Naam van de sessie').fill('Live test');
  await page.getByRole('button', { name: 'Sessie aanmaken' }).click();
  await page.getByRole('checkbox').check();
  const uploads: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET') uploads.push(request.method());
  });
  await page
    .getByRole('button', { name: 'Start luisteren', exact: true })
    .click();
  await expect(
    page.getByText('Aan het luisteren', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Pauzeren', exact: true }).click();
  await expect(
    page.getByText('Opname gepauzeerd', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Verder luisteren', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Stoppen en verwerken', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Start luisteren', exact: true }),
  ).toBeEnabled();
  expect(uploads).toEqual([]);
});
