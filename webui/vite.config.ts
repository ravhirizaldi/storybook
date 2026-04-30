import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

function suppressRefreshWarnings(): Plugin {
  return {
    name: 'suppress-refresh-warnings',
    enforce: 'post',
    configResolved(config) {
      const originalWarn = config.logger.warn;
      config.logger.warn = (msg, options) => {
        if (
          typeof msg === 'string' &&
          msg.includes('The above dynamic import cannot be analyzed by Vite')
        )
          return;
        originalWarn(msg, options);
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), suppressRefreshWarnings()],
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      },
    },
  },
});
