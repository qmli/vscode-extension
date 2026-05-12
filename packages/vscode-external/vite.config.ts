import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode }) => ({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*', '../../types/global.d.ts'],
      exclude: ['src/**/*.test.*', 'src/**/*.spec.*']
    })
  ],
  build: {
    sourcemap: mode === 'development',
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'channels/shellChannel': resolve(__dirname, 'src/channels/shellChannel.ts'),
        'providers/shellBasedProvider': resolve(__dirname, 'src/providers/shellBasedProvider.ts'),
        'types/protocol': resolve(__dirname, 'src/types/protocol.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      external: (id) => {
        // VS Code API — 由运行时宿主提供
        if (id === 'vscode') {
          return true;
        }

        // Node.js 内置模块
        const nodeBuiltins = [
          'assert',
          'async_hooks',
          'buffer',
          'child_process',
          'cluster',
          'console',
          'constants',
          'crypto',
          'dgram',
          'dns',
          'domain',
          'events',
          'fs',
          'http',
          'http2',
          'https',
          'inspector',
          'module',
          'net',
          'os',
          'path',
          'perf_hooks',
          'process',
          'punycode',
          'querystring',
          'readline',
          'repl',
          'stream',
          'string_decoder',
          'timers',
          'tls',
          'trace_events',
          'tty',
          'url',
          'util',
          'v8',
          'vm',
          'worker_threads',
          'zlib'
        ];

        if (nodeBuiltins.includes(id) || id.startsWith('node:')) {
          return true;
        }

        return false;
      },
      output: {
        exports: 'named'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}));
