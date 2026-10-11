import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
async function walk(path) {
  const list = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const name = `${path}/${entry.name}`;
    if (entry.isDirectory()) list.push(...(await walk(name)));
    else if (entry.name !== 'sw.js') list.push(name);
  }
  return list;
}
const files = await walk('dist');
const hash = createHash('sha256');
for (const path of files) hash.update(await readFile(path));
const version = hash.digest('hex').slice(0, 12),
  urls = files.map((f) => `/${f.slice(5)}`);
await writeFile(
  'dist/sw.js',
  `const CACHE='dnd-shell-${version}';
const FILES=${JSON.stringify(['/', ...urls])};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('dnd-shell-')&&key!==CACHE)await caches.delete(key);await self.clients.claim();for(const client of await self.clients.matchAll())client.postMessage({type:'OFFLINE_READY'});})()));
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(request.mode==='navigate'?'/':request,{ignoreVary:true});return cached||fetch(request);})());});
`,
);
console.log(`Offline app-shell ${version}: ${urls.length} bestanden.`);
