/**
 * Vite 配置示例
 * 展示如何在 Vite 项目中集成 VSCode 主题模拟系统
 */

import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';
import { vscodeThemePlugin } from '../src';

// 基础配置
export const baseConfig = defineConfig({
  plugins: [
    vue(),
    vscodeThemePlugin({
      defaultTheme: 'theme-dark-vars' as const,
      enableDevTools: true,
      autoInjectStyles: true,
      debug: false
    })
  ]
});

// 开发环境配置
export const devConfig = defineConfig({
  plugins: [
    vue(),
    vscodeThemePlugin({
      defaultTheme: 'theme-dark-vars' as const,
      enableDevTools: true,
      autoInjectStyles: true,
      debug: true
    })
  ],
  server: {
    port: 3000,
    open: true
  }
});

// 生产环境配置
export const prodConfig = defineConfig({
  plugins: [
    vue(),
    vscodeThemePlugin({
      defaultTheme: 'theme-dark-vars' as const,
      enableDevTools: false,
      autoInjectStyles: true,
      debug: false
    })
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'terser'
  }
});

// 完整配置示例
export const defaultConfig = defineConfig(({ mode }) => {
  const isDev = mode === 'development';
  const isProd = mode === 'production';

  return {
    plugins: [
      vue(),
      vscodeThemePlugin({
        // 根据环境设置不同配置
        defaultTheme: 'theme-dark-vars' as const,
        enableDevTools: isDev,
        autoInjectStyles: true,
        debug: isDev
      })
    ],

    // 开发服务器配置
    server: isDev
      ? {
          port: 3000,
          open: true,
          cors: true,
          // 代理配置（如果需要）
          proxy: {
            '/api': {
              target: 'http://localhost:8080',
              changeOrigin: true
            }
          }
        }
      : undefined,

    // 构建配置
    build: isProd
      ? {
          outDir: 'dist',
          sourcemap: false,
          minify: 'terser',
          rollupOptions: {
            output: {
              manualChunks: {
                // 将 VSCode 主题相关代码分离到单独的 chunk
                'vscode-theme': ['@your-org/vscode-theme-mock']
              }
            }
          }
        }
      : undefined,

    // CSS 配置
    css: {
      preprocessorOptions: {
        scss: {
          // 自动导入 VSCode 主题变量
          additionalData: `
            @use '@your-org/vscode-theme-mock/styles/mock/index.scss' as *;
          `
        }
      }
    },

    // 解析配置
    resolve: {
      alias: {
        // 别名配置
        '@': '/src',
        '@themes': '/src/themes',
        '@components': '/src/components'
      }
    },

    // 环境变量
    define: {
      __VSCODE_THEME_DEBUG__: isDev,
      __VSCODE_THEME_VERSION__: JSON.stringify('1.0.0')
    }
  };
});

/**
 * 高级配置示例
 * 包含更多自定义选项
 */
export const advancedConfig = defineConfig({
  plugins: [
    vue(),
    vscodeThemePlugin({
      defaultTheme: 'theme-dark-vars' as const,
      enableDevTools: true,
      autoInjectStyles: true,
      debug: true
    })
  ],

  // 开发服务器配置
  server: {
    port: 3000,
    open: true,
    cors: true,
    // 热更新配置
    hmr: {
      overlay: true
    }
  },

  // CSS 配置
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `
          @use '@your-org/vscode-theme-mock/styles/mock/index.scss' as *;
          @use './src/styles/variables.scss' as *;
        `,
        // 自定义函数
        functions: {
          // 可以添加自定义 SCSS 函数
        }
      }
    },
    // PostCSS 配置
    postcss: {
      plugins: [
        // 可以添加 PostCSS 插件
      ]
    }
  },

  // 构建优化
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vscode-theme': ['@your-org/vscode-theme-mock'],
          'vue-vendor': ['vue', 'vue-router'],
          'ui-vendor': ['element-plus']
        }
      }
    }
  },

  // 依赖优化
  optimizeDeps: {
    include: ['@your-org/vscode-theme-mock', 'vue', 'element-plus'],
    exclude: [
      // 排除不需要预构建的依赖
    ]
  }
});

/**
 * 多环境配置示例
 */
export const multiEnvConfig = defineConfig(({ mode }) => {
  const configs = {
    development: {
      defaultTheme: 'theme-dark-vars' as const,
      enableDevTools: true,
      debug: true
    },
    staging: {
      defaultTheme: 'theme-light-vars' as const,
      enableDevTools: false,
      debug: false
    },
    production: {
      defaultTheme: 'theme-dark-vars' as const,
      enableDevTools: false,
      debug: false
    }
  };

  const envConfig = configs[mode as keyof typeof configs] || configs.development;

  return {
    plugins: [vue(), vscodeThemePlugin(envConfig)],

    define: {
      __VSCODE_THEME_ENV__: JSON.stringify(mode),
      __VSCODE_THEME_CONFIG__: JSON.stringify(envConfig)
    }
  };
});
