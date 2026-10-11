import { expect, it } from 'vitest';
import { verifiedResponse } from './integrity';
const asset = {
  path: 'test.onnx',
  size: 3,
  sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
};
it('accepteert alleen bytes die overeenkomen met de gepinde SHA-256', async () => {
  expect(await verifiedResponse(new Response('abc'), asset).text()).toBe('abc');
  await expect(
    verifiedResponse(new Response('abd'), asset).arrayBuffer(),
  ).rejects.toThrow('Integriteitscontrole');
  await expect(
    verifiedResponse(new Response('abc'), { ...asset, size: 4 }).arrayBuffer(),
  ).rejects.toThrow('Integriteitscontrole');
});
