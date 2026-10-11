// Optional real-model browser check. Supply trusted, pinned model files and a legal
// WAV fixture outside the checkout. This never installs a mock model adapter.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
const root = process.env.MODEL_FIXTURE_DIR,
  audio = process.env.AUDIO_FIXTURE;
if (!root || !audio)
  throw Error(
    'Set MODEL_FIXTURE_DIR and AUDIO_FIXTURE. See docs/DEVELOPMENT.md.',
  );
const base = resolve(root);
const server = createServer((req, res) => {
  const file = resolve(
    base,
    decodeURIComponent(new URL(req.url, 'http://localhost').pathname).slice(1),
  );
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  };
  if (!file.startsWith(base + sep) || !existsSync(file)) {
    res.writeHead(404, headers).end();
    return;
  }
  res.writeHead(200, {
    ...headers,
    'Content-Length': statSync(file).size,
    'Content-Type': file.endsWith('.json')
      ? 'application/json'
      : 'application/octet-stream',
  });
  createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(4174, '127.0.0.1', resolve));
const profile = await mkdtemp('/tmp/dnd-browser-');
const context = await chromium.launchPersistentContext(profile, {
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  await context.route('https://huggingface.co/**', async (route) => {
    const url = new URL(route.request().url());
    const prefix =
      '/onnx-community/ultravox-v0_5-llama-3_2-1b-ONNX/resolve/1ccaedd19b01bc50b5257800ea8b90f53a5cbffa/';
    if (!url.pathname.startsWith(prefix)) {
      console.error('Unexpected model request:', url.pathname);
      await route.abort();
      return;
    }
    await route.fulfill({
      status: 307,
      headers: {
        location: `http://127.0.0.1:4174/${url.pathname.slice(prefix.length)}`,
        'access-control-allow-origin': '*',
      },
    });
  });
  const page = await context.newPage();
  page.on('pageerror', (e) => console.error('Browser error:', e.message));
  page.on('console', (m) => {
    if (m.type() === 'warning' || m.type() === 'error')
      console.log('Browser:', m.text());
  });
  page.on('requestfailed', (r) =>
    console.error(
      'Request failed:',
      new URL(r.url()).pathname,
      r.failure()?.errorText,
    ),
  );
  await page.goto('http://127.0.0.1:4173');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page
    .getByRole('button', { name: 'Lokale modellen', exact: true })
    .click();
  await page
    .getByRole('button', { name: /Vergelijkingsmodel Ultravox 1B/ })
    .click();
  await page.getByLabel('Uitvoering').selectOption('wasm');
  await page
    .getByRole('button', { name: 'Downloaden en laden', exact: true })
    .click();
  console.log('Loading actual Ultravox weights in Chromium/WASM…');
  await page.waitForFunction(
    () =>
      document.body.textContent.includes('Model geladen. Voer') ||
      document.querySelector('[role="alert"]'),
    {},
    { timeout: 600000 },
  );
  if (await page.getByRole('alert').count())
    throw Error(await page.getByRole('alert').innerText());
  console.log(
    'Cache inventory',
    await page.evaluate(async () => {
      const cache = await caches.open('dnd-models-v1');
      return Promise.all(
        (await cache.keys()).map(async (key) => ({
          path: new URL(key.url).pathname,
          size: (await cache.match(key))?.headers.get('content-length'),
        })),
      );
    }),
  );
  console.log(
    'Model load passed. Releasing worker and reloading offline from Cache Storage.',
  );
  await page
    .getByRole('button', { name: 'Model ontladen / annuleren' })
    .click();
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole('button', { name: 'Lokale modellen', exact: true })
    .click();
  await page
    .getByRole('button', { name: /Vergelijkingsmodel Ultravox 1B/ })
    .click();
  await page.getByLabel('Uitvoering').selectOption('wasm');
  await page.getByRole('button', { name: 'Laden uit lokale cache' }).click();
  await page.waitForFunction(
    () =>
      document.body.textContent.includes('Model geladen. Voer') ||
      document.querySelector('[role="alert"]'),
    {},
    { timeout: 600000 },
  );
  if (await page.getByRole('alert').count())
    throw Error(await page.getByRole('alert').innerText());
  await page.getByRole('button', { name: 'Naar testmodus' }).click();
  await page.getByLabel('Audiofragment kiezen').setInputFiles(audio);
  await page
    .getByLabel('Taakstrategie')
    .selectOption(process.env.MODEL_STRATEGY || 'two-pass');
  await page.getByText('Fragmenten en context', { exact: true }).click();
  await page.getByLabel('Uitvoertokens per aanroep').fill('128');
  await page.getByLabel('Stilte voor fragmentgrens').fill('2000');
  let networkRequests = 0;
  context.on('request', (request) => {
    if (new URL(request.url()).hostname !== '127.0.0.1') networkRequests++;
  });
  await page.getByRole('button', { name: 'Start test', exact: true }).click();
  console.log('Actual audio inference running offline…');
  await page
    .getByRole('heading', { name: 'Beoordeel deze proef' })
    .waitFor({ timeout: 600000 });
  const stored = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const r = indexedDB.open('dnd-notulist');
        r.onsuccess = () => {
          const db = r.result,
            q = db.transaction('state').objectStore('state').get('current');
          q.onsuccess = () => {
            resolve(q.result);
            db.close();
          };
        };
      }),
  );
  const run = stored.runs[0];
  console.log(
    JSON.stringify(
      {
        run,
        externalRequestsDuringInference: networkRequests,
        outputPresent: !!(await page.locator('.model-output').count()),
        output: await page.locator('.model-output').allTextContents(),
        proposals: await page
          .getByText(/notitievoorstellen in deze run/)
          .allTextContents(),
      },
      null,
      2,
    ),
  );
  if (run.failed || !run.chunks || networkRequests)
    throw Error('Actual-model check failed');
  await page.screenshot({
    path: '/tmp/dnd-real-inference.png',
    fullPage: true,
  });
  console.log(
    'PASS: actual model load, offline reload and audio inference. This does not establish Dutch accuracy or Pixel performance.',
  );
} finally {
  await context.close();
  await rm(profile, { recursive: true, force: true });
  await new Promise((resolve) => server.close(resolve));
}
