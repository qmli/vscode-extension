// import { fileURLToPath } from 'node:url'
import path from 'path';
import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// If viteConfig is a function, call it to get the config object
const configEnv = { mode: 'test', command: 'serve' as const };
const baseConfig = typeof viteConfig === 'function' ? viteConfig(configEnv) : viteConfig;

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: path.resolve(__dirname, 'src'),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: ['src/**/*.{js,ts,vue}'],
        exclude: ['src/**/*.d.ts', 'src/**/*.test.{js,ts}', 'src/**/*.spec.{js,ts}'],
        thresholds: {
          branches: 60,
          lines: 70
        }
      }
    }
  })
);
