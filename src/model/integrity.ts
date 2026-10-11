import { sha256 } from '@noble/hashes/sha2.js';
export interface Asset {
  path: string;
  size: number;
  sha256: string | null;
}
/** Streaming SHA-256 avoids another model-sized buffer. A mismatch errors the
 * stream before it can be accepted by ONNX Runtime or successfully cached. */
export function verifiedResponse(
  response: Response,
  asset: Asset,
  progress?: (bytes: number) => void,
): Response {
  if (!response.ok || !response.body || !asset.sha256)
    throw Error(`Modelbestand ontbreekt of heeft geen checksum: ${asset.path}`);
  const hash = sha256.create();
  let length = 0;
  const stream = response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        length += chunk.byteLength;
        hash.update(chunk);
        progress?.(length);
        controller.enqueue(chunk);
      },
      flush() {
        const actual = Array.from(hash.digest(), (v) =>
          v.toString(16).padStart(2, '0'),
        ).join('');
        if (length !== asset.size || actual !== asset.sha256)
          throw Error(
            `Integriteitscontrole mislukt: ${asset.path}. Wis de modelcache en download opnieuw.`,
          );
      },
    }),
  );
  const headers = new Headers(response.headers);
  headers.set('content-length', String(asset.size));
  headers.delete('content-encoding');
  return new Response(stream, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
export async function verifyCachedResponse(
  response: Response,
  asset: Asset,
  progress?: (bytes: number) => void,
) {
  const reader = verifiedResponse(response, asset, progress).body!.getReader();
  while (!(await reader.read()).done) {
    /* Consume in bounded chunks without a second model buffer. */
  }
}
