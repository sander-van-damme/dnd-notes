import { readFile, writeFile, readdir, rm, stat } from 'node:fs/promises';

// Pages limits individual assets to 25 MiB. Supply ONNX its binary from local
// chunks; no CDN or service-worker interception is required to initialize it.
const runtime = 'ort-wasm-simd-threaded.asyncify';
const binary = await readFile(`dist/ort/${runtime}.wasm`);
const chunkSize = 16 * 1024 * 1024;
const parts = [];
for (let offset = 0; offset < binary.length; offset += chunkSize) {
  const path = `/ort/${runtime}.part${parts.length}`;
  const bytes = binary.subarray(offset, offset + chunkSize);
  await writeFile(`dist${path}`, bytes);
  parts.push({ path, size: bytes.length });
}
await writeFile('dist/ort/runtime.json', JSON.stringify(parts));
for (const name of await readdir('dist/ort')) {
  if (
    name.endsWith('.wasm') ||
    (name.endsWith('.mjs') && name !== `${runtime}.mjs`)
  )
    await rm(`dist/ort/${name}`);
}
// Vite also emits the library's default binary, which our explicit wasmBinary
// override does not use.
for (const name of await readdir('dist/assets')) {
  if (name.endsWith('.wasm')) await rm(`dist/assets/${name}`);
}
async function check(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) await check(path);
    else if ((await stat(path)).size > 25 * 1024 * 1024)
      throw Error(`Cloudflare Pages asset exceeds 25 MiB: ${path}`);
  }
}
await check('dist');
console.log(
  `Cloudflare Pages: runtime verdeeld over ${parts.length} lokale bestanden.`,
);
