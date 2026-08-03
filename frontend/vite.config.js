import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Required so the dev server is reachable from OUTSIDE the Docker
    // container (i.e. from your actual browser on your host machine).
    host: true,
    port: 5173,
    // Docker Desktop on Windows doesn't reliably forward native filesystem
    // change events across a bind mount into the Linux container, so Vite's
    // default watcher can silently miss edits (HMR just never fires - no
    // error, it looks like the app ignored your change). Polling instead of
    // relying on inotify fixes that at the cost of a bit of CPU.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
