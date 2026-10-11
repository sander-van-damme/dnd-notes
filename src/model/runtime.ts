export async function cloudflareWasm(): Promise<Uint8Array> {
  const response = await fetch('/ort/runtime.json');
  if (!response.ok) throw Error('Lokale runtimebeschrijving kon niet laden.');
  const parts: { path: string; size: number }[] = await response.json();
  const binary = new Uint8Array(
    parts.reduce((total, part) => total + part.size, 0),
  );
  let offset = 0;
  for (const part of parts) {
    const response = await fetch(part.path);
    if (!response.ok)
      throw Error(`Lokale runtime kon niet laden: ${part.path}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length !== part.size)
      throw Error('Onvolledig lokaal runtimebestand.');
    binary.set(bytes, offset);
    offset += bytes.length;
  }
  return binary;
}
