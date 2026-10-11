import {
  MODEL_CACHE,
  modelAssets,
  modelFiles,
  modelUrl,
  modelBytes,
} from './catalog';
import { verifiedResponse, verifyCachedResponse } from './integrity';

// Complete the pinned WebGPU profile before Transformers starts parallel loads.
// In 4.3.1 a missing external-data file can leave its async Promise executor pending.
export async function prepareModel(
  download: boolean,
  progress: (label: string, percent: number) => void,
) {
  const cache = await caches.open(MODEL_CACHE);
  let completed = 0;
  for (const path of modelFiles) {
    const url = modelUrl(path),
      asset = modelAssets.find((a) => a.path === path);
    let cached = await cache.match(url),
      lastProgress = 0;
    const report = (verb: string, bytes: number) => {
      if (
        performance.now() - lastProgress > 200 ||
        bytes === asset?.size ||
        bytes === 0
      ) {
        progress(`${verb}: ${path}`, (100 * (completed + bytes)) / modelBytes);
        lastProgress = performance.now();
      }
    };
    if (cached && asset) {
      report('Controleren', 0);
      try {
        await verifyCachedResponse(cached, asset, (bytes) =>
          report('Controleren', bytes),
        );
      } catch {
        await cache.delete(url);
        cached = undefined;
      }
    }
    if (!cached) {
      if (!download)
        throw Error(
          `Modeldownload onvolledig: ${path}. Download het model opnieuw via Instellingen.`,
        );
      report('Downloaden', 0);
      const response = await fetch(url, {
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      if (!response.ok)
        throw Error(`Download mislukt (${response.status}): ${path}`);
      try {
        await cache.put(
          url,
          asset
            ? verifiedResponse(response, asset, (bytes) =>
                report('Downloaden', bytes),
              )
            : response,
        );
      } catch (error) {
        throw Error(
          `Modelbestand kon niet worden opgeslagen: ${path}. Controleer vrije browseropslag en gebruik een normaal browserprofiel. ${error instanceof Error ? error.message : ''}`,
          { cause: error },
        );
      }
    }
    completed += asset?.size ?? 0;
  }
  progress('Download compleet', 100);
}
