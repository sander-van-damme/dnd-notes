// Optional real Gemma check on a machine with a WebGPU shader-f16 adapter.
// This downloads several GB on first use; normal CI uses explicit worker stubs.
import { chromium } from 'playwright';
import { mkdtemp, rm } from 'node:fs/promises';
if (!process.env.AUDIO_FIXTURE)
  throw Error('Set AUDIO_FIXTURE to a short permitted audio file.');
const temporary = !process.env.MODEL_PROFILE_DIR;
const profile =
  process.env.MODEL_PROFILE_DIR || (await mkdtemp('/tmp/dnd-gemma-'));
const context = await chromium.launchPersistentContext(profile, {
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: process.env.HEADLESS !== '0',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await context.newPage();
  await page.goto(process.env.APP_URL || 'http://127.0.0.1:4173');
  const supported = await page.evaluate(async () =>
    (await navigator.gpu?.requestAdapter())?.features.has('shader-f16'),
  );
  if (!supported)
    throw Error(
      'Deze machine heeft geen WebGPU-adapter met shader-f16; echte inferentie niet getest.',
    );
  await page.getByRole('button', { name: 'Instellingen', exact: true }).click();
  await page
    .getByRole('button', { name: 'Testlaboratorium', exact: true })
    .click();
  await page
    .getByLabel('Audiofragment kiezen')
    .setInputFiles(process.env.AUDIO_FIXTURE);
  await page.getByRole('button', { name: 'Start test', exact: true }).click();
  await page.waitForFunction(
    () =>
      document.body.textContent.includes('Beoordeel deze proef') ||
      !!document.querySelector('[role="alert"]'),
    {},
    { timeout: 1200000 },
  );
  if (await page.getByRole('alert').count())
    throw Error(await page.getByRole('alert').innerText());
  console.log(
    'Echte Gemma-proef voltooid. Model blijft geladen; inhoudelijke beoordeling blijft nodig.',
  );
  console.log(await page.locator('.model-output').allTextContents());
  console.log(
    await page.getByText(/notitievoorstellen in deze run/).allTextContents(),
  );
} finally {
  await context.close();
  if (temporary) await rm(profile, { recursive: true, force: true });
}
