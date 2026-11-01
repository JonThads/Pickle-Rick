import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Stops Vite's browser client from hard-reloading the page.
 *
 * Edge and Chrome intermittently lose Vite's HMR websocket
 * ("[vite] server connection lost. Polling for restart..."). The client's
 * reaction is location.reload(), which wipes half-typed login/register
 * forms. We keep the websocket and normal HMR updates, but turn every
 * client-initiated hard reload into a console warning - press F5 yourself
 * after a change that HMR can't apply. Delete this plugin to restore the
 * default behaviour. (PR-115)
 */
function noAutoReload() {
  return {
    name: 'no-auto-reload',
    transform(code, id) {
      if (!id.includes('vite/dist/client/client.mjs')) return null;
      return code.replaceAll(
        'location.reload()',
        'console.warn("[no-auto-reload] Vite asked for a page reload - press F5 if the page looks stale.")'
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), noAutoReload()],
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
