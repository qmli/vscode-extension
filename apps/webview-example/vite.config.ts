// import { fileURLToPath, URL } from 'node:url'
import path from 'path';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig } from 'vite';
import vueDevTools from 'vite-plugin-vue-devtools';

// https://vite.dev/config/
export default defineConfig(({ mode, command }) => ({
  base: './',
  build: {
    target: 'es2015', // 或更高版本，根据浏览器支持调整
    outDir: path.resolve(__dirname, '../../dist/example'), // 输出到 extension/dist/
    emptyOutDir: true, // 清空输出目录（慎用，确保不会删除其他模块输出）
    sourcemap: mode === 'development' ? 'inline' : false, // 开发模式使用 inline，生产模式不生成 sourcemap
    rollupOptions: {
      output: {
        format: 'iife', // ❗关键：非模块格式，兼容 WebView
        inlineDynamicImports: true, // ❗关键：不生成分包
        // 确保所有资源都被内联
        manualChunks: undefined
      }
    },
    chunkSizeWarningLimit: 2000
  },
  plugins: [
    vue(),
    vueJsx(),
    command === 'serve' ? vueDevTools({ appendTo: 'main.ts' }) : null,
    {
      name: 'remove-module-crossorigin',
      // 这是 transformIndexHtml 钩子，接收 index.html 的内容字符串，返回修改后的字符串
      transformIndexHtml: function (html) {
        return html
          .replace(/<script type="module" crossorigin src="(.+?)"><\/script>/, '<script  defer src="$1"></script>')
          .replace(
            /<link rel="stylesheet" crossorigin href="(.+?)">/, // 移除 link 上的 crossorigin
            '<link rel="stylesheet" href="$1">'
          );
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../../shared'),
      '@orientais/webview-core/webview-core.css': path.resolve(
        __dirname,
        '../../packages/webview-core/src/styles/index.scss'
      ),
      '@orientais/webview-core': path.resolve(__dirname, '../../packages/webview-core/src')
    }
  },
  optimizeDeps: {
    include: ['webview-core/i18n']
  },
  server: {
    host: '0.0.0.0', // 强制指定 host，避免 ipv6 问题
    port: 5185, // 默认端口，确保与 htmlcontext.ts 中的默认值一致
    strictPort: true, // 端口被占用时直接退出，防止端口偏移导致连接失败
    cors: true // 允许跨域，Webview 是在 vscode-webview:// 协议下运行的
  }
}));
