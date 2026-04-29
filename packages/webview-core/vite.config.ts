// This is a Vite configuration file
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { libInjectCss } from 'vite-plugin-lib-inject-css';
import { vscodeThemePlugin } from './src/styles/mock/utils/vite-plugin';

export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    // 在库模式下向每个 chunk 顶部注入对提取出的 CSS 的 import，使用组件时样式会一起被打包
    libInjectCss(),
    dts({
      insertTypesEntry: true,
      include: ['src/**/*', '../../types/global.d.ts'],
      exclude: ['src/**/*.test.*', 'src/**/*.spec.*']
    }),
    // 在开发模式下启用VSCode主题模拟
    ...(mode === 'development'
      ? [
          vscodeThemePlugin({
            defaultTheme: 'theme-dark-vars',
            enableDevTools: true,
            enablePerformanceMonitoring: true,
            autoInjectStyles: true,
            debug: true
          })
        ]
      : [])
  ],
  css: {
    preprocessorOptions: {
      scss: {
        // additionalData: `@use "@/styles/variables.scss"; @use "@/styles/mixins.scss";`,
        charset: false
      }
    }
  },
  build: {
    // 开发模式生成 sourcemap，生产模式不生成
    sourcemap: mode === 'development',
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        components: resolve(__dirname, 'src/components/index.ts'),
        utils: resolve(__dirname, 'src/utils/index.ts'),
        stores: resolve(__dirname, 'src/stores/index.ts'),
        icons: resolve(__dirname, 'src/icons/index.ts'),
        styles: resolve(__dirname, 'src/styles/index.ts'),
        services: resolve(__dirname, 'src/services/index.ts'),
        i18n: resolve(__dirname, 'src/i18n/index.ts'),
        types: resolve(__dirname, 'src/types/index.ts'),
        mock: resolve(__dirname, 'src/styles/mock/src/index.ts'),
        // 添加独立的 CSS 入口
        'webview-core-css': resolve(__dirname, 'src/styles/index.scss'),
        'webview-mock-theme': resolve(__dirname, 'src/styles/mock/index.scss')
      },
      formats: ['es'],
      chunkSizeWarningLimit: 2000
    },
    // 启用 CSS 代码分割以生成多个独立的 CSS 文件
    cssCodeSplit: true,
    rollupOptions: {
      external: (id) => {
        // 将 Vue 生态系统和内部包标记为外部依赖
        return ['vue', 'pinia', 'vue-i18n'].includes(id) || id.startsWith('@packages/') || id.startsWith('@shared/');
      },
      output: {
        globals: {
          vue: 'Vue',
          pinia: 'Pinia',
          'vue-i18n': 'VueI18n'
        },
        // 控制静态资源（包括生成的单一 CSS 文件）的命名。
        // 当以 library 模式构建（尤其是多入口或 cssCodeSplit: false）时，Vite/Rollup
        // 会基于 package.json 的 `name` 或 entry 名称生成 CSS 输出名，
        // 使用 assetFileNames 可自定义输出文件名或路径。
        assetFileNames: (assetInfo: { names?: string[]; name?: string }) => {
          // assetInfo.name 已被弃用，新字段为 assetInfo.names (array)。
          // 支持两者以兼容不同 rollup/vite 版本。
          const possibleName =
            Array.isArray(assetInfo.names) && assetInfo.names.length > 0 ? assetInfo.names[0] : assetInfo.name;

          if (possibleName && possibleName.endsWith('.css')) {
            // 根据不同的 CSS 文件给予不同的命名
            if (possibleName.includes('webview-core-css')) {
              return 'webview-core.css';
            }
            if (possibleName.includes('webview-mock-theme')) {
              return 'webview-mock-theme.css';
            }
            return '[name][extname]';
          }
          return 'assets/[name]-[hash][extname]';
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
