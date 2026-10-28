import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
// CI sets APP_VERSION (scripts/next-version.sh); local builds are marked as dev.
const version = process.env.APP_VERSION ?? `${pkg.version}-dev`;

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    {
      // version.json lets an already-open web app notice that a newer deploy exists.
      name: 'version-file',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version }) });
      },
    },
  ],
});
