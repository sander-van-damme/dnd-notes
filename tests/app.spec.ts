import { expect, test, type Page } from '@playwright/test';
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
async function campaign(page: Page, name: string) {
  await page.getByRole('button', { name: 'Nieuwe campagne' }).click();
  await page.getByLabel('Naam van de campagne').fill(name);
  await page.getByRole('button', { name: 'Campagne aanmaken' }).click();
}
async function session(page: Page, name: string) {
  await page
    .getByRole('button', { name: 'Nieuwe sessie', exact: true })
    .click();
  await page.getByLabel('Naam van de sessie').fill(name);
  await page.getByRole('button', { name: 'Sessie aanmaken' }).click();
}
async function settings(page: Page, name: string) {
  await page.getByRole('button', { name: 'Instellingen', exact: true }).click();
  await page.getByRole('button', { name, exact: true }).click();
}
test('campagne, bewerken, scène afronden, herladen en offline sessienotities', async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await campaign(page, 'De groene vallei');
  await session(page, 'De gesloten poort');
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
  await page.getByRole('button', { name: /De groene vallei/ }).click();
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
  await page.getByRole('button', { name: /De groene vallei/ }).click();
  await context.setOffline(true);
  await expect(
    page.getByText('Alles lokaal opgeslagen', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /De groene vallei/ }).click();
  await expect(page.getByLabel('Notitie bewerken')).toHaveValue(
    'Eldrin bewaakt de poort.',
  );
  await page.getByLabel('Notitie bewerken').fill('Eldrin opent de poort.');
  await expect(
    page.getByText('Alles lokaal opgeslagen', { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /De groene vallei/ }).click();
  await expect(page.getByLabel('Notitie bewerken')).toHaveValue(
    'Eldrin opent de poort.',
  );
  expect(errors).toEqual([]);
});
test('woordenboek bevestigt kandidaten expliciet', async ({ page }) => {
  await page.goto('/');
  await campaign(page, 'Ravenveld');
  await page
    .getByRole('button', { name: 'Campagne-instellingen', exact: true })
    .click();
  await page.getByLabel('Naam van de campagne').fill('Ravenveld II');
  await page.getByLabel('Korte beschrijving').fill('Een mistig grensland');
  await page.getByRole('button', { name: 'Opslaan', exact: true }).click();
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
  await page.getByRole('button', { name: /Ravenveld II/ }).click();
  await page
    .getByRole('button', { name: 'Campagne-instellingen', exact: true })
    .click();
  await expect(page.getByLabel('Korte beschrijving')).toHaveValue(
    'Een mistig grensland',
  );
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
    page.getByRole('heading', { name: 'Avonturenboek' }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: '/tmp/dnd-mobile.png', fullPage: true });
});
test('automatisch laden, model behouden na test en microfoon; geen audio-opslag', async ({
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
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: async () => ({
          features: new Set(['shader-f16']),
          info: {},
        }),
      },
    }),
  );
  let loads = 0;
  page.on('request', (request) => {
    if (/inference\.worker-/.test(request.url())) loads++;
  });
  await page.goto('/');
  await settings(page, 'Testlaboratorium');
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
  await expect(page.getByText('Kwaliteit beoordeeld')).toBeVisible();
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
  await campaign(page, 'Microfoontest');
  await session(page, 'Live test');
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
  expect(loads).toBe(1);
});

test('eerste opname laadt automatisch zonder voorafgaande modeltest', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: async () => ({
          features: new Set(['shader-f16']),
          info: {},
        }),
      },
    }),
  );
  await page.route('**/sw.js', (route) => route.abort());
  await page.route(/\/assets\/inference\.worker-.*\.js$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      headers: { 'Cross-Origin-Embedder-Policy': 'credentialless' },
      body: `self.onmessage=({data})=>{if(data.type==='load')self.postMessage({id:data.id,result:true});else self.postMessage({id:data.id,result:{rawText:'FACT: Een deur gaat open.',transcript:'',totalMs:20,inputTokens:10,outputTokens:10}});};`,
    }),
  );
  await page.goto('/');
  await campaign(page, 'Eerste opname');
  await session(page, 'Zonder test');
  await page.getByRole('checkbox').check();
  await expect(
    page.getByRole('button', { name: 'Start luisteren', exact: true }),
  ).toBeEnabled();
  await page
    .getByRole('button', { name: 'Start luisteren', exact: true })
    .click();
  await expect(
    page.getByText('Aan het luisteren', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Stoppen en verwerken', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Start luisteren', exact: true }),
  ).toBeEnabled();
});

test('laadfout is zichtbaar en logexport bevat build en foutdetails zonder notities', async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: async () => ({
          features: new Set(['shader-f16']),
          info: {},
        }),
      },
    }),
  );
  await page.route('**/sw.js', (route) => route.abort());
  await page.route(/\/assets\/inference\.worker-.*\.js$/, (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      headers: { 'Cross-Origin-Embedder-Policy': 'credentialless' },
      body: `self.onmessage=({data})=>self.postMessage({id:data.id,error:'Modeldownload onvolledig: embed_tokens_q4f16.onnx_data'});`,
    }),
  );
  await page.goto('/');
  await campaign(page, 'Geheime campagnenaam');
  await session(page, 'Geheime sessienaam');
  await page.getByRole('checkbox').check();
  await page
    .getByRole('button', { name: 'Start luisteren', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText(
    'embed_tokens_q4f16.onnx_data',
  );
  const file = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Logs exporteren', exact: true })
    .click();
  const download = await file;
  const stream = await download.createReadStream();
  let text = '';
  for await (const chunk of stream!) text += chunk.toString();
  const log = JSON.parse(text);
  expect(log.build).toMatch(/^[0-9a-f]{40}/);
  expect(text).toContain('embed_tokens_q4f16.onnx_data');
  expect(text).not.toContain('Geheime campagnenaam');
  expect(text).not.toContain('Geheime sessienaam');
});

test('iconenbalk, sessielijst en instellingen met testsubpagina', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page
      .getByRole('navigation', { name: 'Hoofdnavigatie' })
      .getByRole('button'),
  ).toHaveCount(2);
  await campaign(page, 'De vallei');
  await session(page, 'Eerste tocht');
  await session(page, 'Tweede tocht');
  const list = page.getByRole('region', { name: 'Sessielogs' });
  await expect(list.getByRole('button')).toHaveCount(2);
  await list.getByRole('button', { name: /Eerste tocht/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Eerste tocht' }),
  ).toBeVisible();
  const sidebar = await page
    .getByRole('complementary', { name: 'Campagnes en sessies' })
    .boundingBox();
  const editor = await page.locator('.session-main').boundingBox();
  expect(sidebar!.x).toBe(64);
  expect(editor!.x).toBeGreaterThan(sidebar!.x + sidebar!.width);
  await page.getByRole('button', { name: 'Instellingen', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Instellingen', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Lokale modellen', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Logs exporteren', exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Audiofragment kiezen')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Testlaboratorium', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Testlaboratorium', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Terug naar instellingen' }).click();
  await expect(
    page.getByRole('heading', { name: 'Lokale modellen', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Avonturenboek', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Eerste tocht' }),
  ).toBeVisible();
  await page.screenshot({ path: '/tmp/dnd-rail-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Sessielijst openen' }).click();
  await list.getByRole('button', { name: /Tweede tocht/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Tweede tocht' }),
  ).toBeVisible();
  await expect(
    page.getByRole('complementary', { name: 'Campagnes en sessies' }),
  ).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: '/tmp/dnd-rail-mobile.png', fullPage: true });
});

test('QAT Mobile is de enige modelkeuze; opruimen wist alleen legacy cache', async ({
  page,
}) => {
  await page.goto('/');
  const legacy =
    'https://huggingface.co/onnx-community/gemma-4-E2B-it-ONNX/resolve/old/config.json';
  const current =
    'https://huggingface.co/onnx-community/gemma-4-E2B-it-qat-mobile-ONNX/resolve/70dab57c7bc59f33b4fc32809299cb8b4465e96c/config.json';
  await page.evaluate(async ({ legacy, current }) => {
    const cache = await caches.open('dnd-models-v1');
    await cache.put(legacy, new Response('{}'));
    await cache.put(current, new Response('{}'));
  }, { legacy, current });
  await page.reload();
  await page.getByRole('button', { name: 'Instellingen', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Gemma 4 E2B Mobile QAT' }),
  ).toBeVisible();
  await expect(page.getByText('2.57 GB')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Oude modelbestanden wissen' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Oude modelbestanden wissen' }).click();
  await expect(
    page.getByRole('button', { name: 'Oude modelbestanden wissen' }),
  ).toHaveCount(0);
  const remaining = await page.evaluate(async () =>
    (await (await caches.open('dnd-models-v1')).keys()).map((x) => x.url),
  );
  expect(remaining).toContain(current);
  expect(remaining).not.toContain(legacy);
});
