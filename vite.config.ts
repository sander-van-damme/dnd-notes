import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { cpSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
const commit =
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
const headers = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'credentialless',
};
export default defineConfig({
  define: { 'import.meta.env.VITE_BUILD_COMMIT': JSON.stringify(commit) },
  plugins: [
    react(),
    {
      name: 'local-onnx-runtime',
      buildStart() {
        mkdirSync('public/ort', { recursive: true });
        for (const suffix of ['mjs', 'wasm'])
          for (const variant of ['', '.jsep', '.asyncify']) {
            const name = `ort-wasm-simd-threaded${variant}.${suffix}`;
            cpSync(
              `node_modules/onnxruntime-web/dist/${name}`,
              `public/ort/${name}`,
            );
          }
      },
    },
  ],
  server: { headers },
  preview: { headers },
  worker: { format: 'es' },
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
});
