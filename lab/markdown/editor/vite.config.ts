// Serves the editor page; the engine and the conf live higher up in the lab worktree.
import { defineConfig } from 'vite';

export default defineConfig({ server: { fs: { allow: ['../../..'] } } });
