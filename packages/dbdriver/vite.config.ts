import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode }) => ({
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      exclude: ['src/**/*.test.*', 'src/**/*.spec.*']
    })
  ],
  build: {
    // 开发模式生成 sourcemap，生产模式不生成
    sourcemap: mode === 'development',
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        types: resolve(__dirname, 'src/types/index.ts')
      },
      formats: ['es']
    },
    rollupOptions: {
      external: (id) => {
        // Node.js 内置模块列表
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

        // 检查是否为 Node.js 内置模块
        if (nodeBuiltins.includes(id) || id.startsWith('node:')) {
          return true;
        }

        // 外部化原生 Node.js 包和依赖
        if (
          id === 'better-sqlite3-sqlcipher' ||
          id === 'better-sqlite3' ||
          id === '@journeyapps/sqlcipher' ||
          id.startsWith('@packages/')
        ) {
          return true;
        }

        // 外部化依赖包中的 Node.js 原生模块相关包
        if (
          id.startsWith('@mapbox/') ||
          id.startsWith('mock-aws-s3') ||
          id.startsWith('aws-sdk') ||
          id.startsWith('nock')
        ) {
          return true;
        }

        return false;
      },
      output: {
        globals: {
          'better-sqlite3-sqlcipher': 'better-sqlite3-sqlcipher'
        },
        // 防止立即执行代码
        exports: 'named'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@packages': resolve(__dirname, '../../packages')
    }
  }
}));
