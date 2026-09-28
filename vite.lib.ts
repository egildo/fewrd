// The published build: one minified ES module per public entry, nothing else.
// Types come from tsc (tsconfig.build.json); demo books stay in the repo.

import { defineConfig, transformWithEsbuild } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    // esnext + no minify: vite's own esbuild pass stays out of the way (it would
    // run after ours and re-print the whitespace); ours below lowers to es2022.
    target: 'esnext',
    minify: false,
    lib: { entry: { index: 'src/index.ts', playground: 'src/playground.ts' }, formats: ['es'] },
  },
  plugins: [
    {
      // Vite leaves whitespace in ES library output to keep /*@__PURE__*/ for
      // tree-shaking; a library this small gains more from full minification.
      name: 'minify-es-lib',
      apply: 'build',
      renderChunk: async (code, chunk) =>
        (await transformWithEsbuild(code, chunk.fileName, { minify: true, format: 'esm', target: 'es2022' })).code,
    },
  ],
});
