import path from 'path';
import webpack from 'webpack';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';

// ES模块中获取__dirname的替代方案
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 环境变量配置
const isDevelopment = process.env.NODE_ENV !== 'production';
const isWatch = process.argv.includes('--watch');

// 路径别名配置
const alias = {
  '@': path.resolve(__dirname, 'src'),
  '@packages': path.resolve(__dirname, '..', '..', 'packages'),
  '@orientais/vscode-core': path.resolve(__dirname, '..', '..', 'packages', 'vscode-core', 'src'),
  '@orientais/vscode-webview': path.resolve(__dirname, '..', '..', 'packages', 'vscode-webview', 'src'),
  '@orientais/vscode-external': path.resolve(__dirname, '..', '..', 'packages', 'vscode-external', 'src')
};

/**@type {import('webpack').Configuration}*/
const config = {
  target: 'node', // vscode扩展运行在Node.js环境

  mode: isDevelopment ? 'development' : 'production',

  entry: './src/extension.ts',

  output: {
    path: path.resolve(__dirname, '../../dist', 'extension'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    // 配置 source map 路径模板，确保调试时能正确映射到源文件
    devtoolModuleFilenameTemplate: (info) => {
      const resourcePath = info.resourcePath;
      const workspaceRoot = path.resolve(__dirname, '../..');

      // 如果是 @packages/dbdriver 的源文件，使用相对于工作区根目录的路径
      if (resourcePath.includes('packages' + path.sep + 'dbdriver' + path.sep + 'src')) {
        const relativePath = path.relative(workspaceRoot, resourcePath).replace(/\\/g, '/');
        // 返回 webpack:// 协议路径，VS Code 会通过 sourceMapPathOverrides 映射
        return `webpack:///${relativePath}`;
      }

      // 如果是 extension 的源文件
      if (resourcePath.includes('apps' + path.sep + 'extension' + path.sep + 'src')) {
        const relativePath = path.relative(workspaceRoot, resourcePath).replace(/\\/g, '/');
        return `webpack:///${relativePath}`;
      }

      // 其他文件使用默认模板
      return `webpack:///${path.relative(workspaceRoot, resourcePath).replace(/\\/g, '/')}`;
    },
    clean: true
  },

  devtool: isDevelopment ? 'source-map' : false,

  // 外部依赖排除
  externals: {
    vscode: 'commonjs vscode',
    '@journeyapps/sqlcipher': 'commonjs @journeyapps/sqlcipher'
    // 注意：@packages/dbdriver 在开发模式下会被打包，以便支持在源文件中调试
  },

  // 模块解析配置
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'], // 支持更多扩展名
    alias: {
      ...alias,
      // 开发模式下，将 @packages/dbdriver 解析到源文件，方便调试
      ...(isDevelopment && {
        '@packages/dbdriver': path.resolve(__dirname, '..', '..', 'packages', 'dbdriver', 'src', 'index.ts'),
        '@packages/dbdriver/src': path.resolve(__dirname, '..', '..', 'packages', 'dbdriver', 'src')
      })
    },
    symlinks: true, // pnpm 需要启用符号链接支持
    modules: [
      'node_modules',
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '..', '..', 'node_modules')
    ]
  },

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        // 开发模式下，包含 @packages/dbdriver 的源文件以便调试
        exclude: (filePath) => {
          // 排除 node_modules，但开发模式下包含 @packages/dbdriver 的源文件
          if (filePath.includes('node_modules')) {
            if (isDevelopment && filePath.includes('packages' + path.sep + 'dbdriver' + path.sep + 'src')) {
              return false; // 包含这个文件
            }
            return true; // 排除其他 node_modules
          }
          return false; // 不排除其他文件
        },
        use: {
          loader: 'ts-loader',
          options: {
            transpileOnly: false, // 必须关闭：transpileOnly 模式下 TypeScript 的 transpileModule API 对含参数装饰器的类生成错误 source map
            // 使用 tsconfig.json 中的配置，不覆盖 module 设置
            // compilerOptions 会与 tsconfig.json 合并
            // 确保生成 source map，特别是对于 @packages/dbdriver 的源文件
            compilerOptions: {
              sourceMap: isDevelopment,
              inlineSourceMap: false, // 使用外部 source map 文件
              sourceRoot: undefined, // 让 webpack 处理 source root
              // 此 DI 系统用 $di$dependencies 属性存储依赖，不依赖 Reflect.metadata。
              // 关闭后 TypeScript 不再生成 __metadata 调用，消除 __decorate 附加代码
              // 与方法体之间的非单调 source map 条目，修复方法体前几行断点无法命中的问题。
              emitDecoratorMetadata: false
            }
          }
        }
      }
    ]
  },

  // 优化配置
  optimization: {
    minimize: !isDevelopment,
    usedExports: true,
    sideEffects: false // 启用tree shaking
  },

  // 插件配置
  plugins: [
    // 环境变量定义
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(isDevelopment ? 'development' : 'production')
    }),

    // 构建进度显示
    new webpack.ProgressPlugin({
      activeModules: true,
      entries: true,
      modules: true,
      dependencies: true
    }),
    // ssh2 的可选原生加速模块（cpu-features、sshcrypto.node）
    // 均已用 try/catch 包裹，缺失时自动降级到纯 JS 实现，功能不受影响。
    // 跳过它们可避免 Webpack 解析二进制 .node 文件时报 "Unexpected character" 错误，
    // 并保证打包到 VSIX 后 ssh2 仍可正常工作。
    new webpack.IgnorePlugin({ resourceRegExp: /^cpu-features$/ }),
    new webpack.IgnorePlugin({ resourceRegExp: /sshcrypto\.node$/ }),
    // eslint-disable-next-line no-useless-escape
    new webpack.ContextReplacementPlugin(/log4js[\/\\]lib[\/\\]appenders/, path.resolve(__dirname, 'src'), {}),

    // 复制静态资源
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, 'src/l10n'),
          to: path.resolve(__dirname, '../../dist/extension/l10n')
        }
      ]
    })
  ],

  // 统计信息配置
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false,
    timings: true,
    warnings: true,
    errors: true
  },

  // 监听模式配置
  watchOptions: {
    ignored: /node_modules/,
    aggregateTimeout: 300,
    poll: false
  },

  // 性能配置
  performance: {
    hints: isDevelopment ? false : 'warning',
    maxAssetSize: 1024 * 1024, // 1MB
    maxEntrypointSize: 1024 * 1024 // 1MB
  }
};

// 开发模式额外配置
if (isDevelopment) {
  // eslint-disable-next-line no-undef
  console.log('🛠️  构建模式: 开发模式');
  config.cache = {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, 'node_modules/.cache/webpack')
  };
} else {
  // eslint-disable-next-line no-undef
  console.log('🚀 构建模式: 生产模式');
}

// 监听模式提示
if (isWatch) {
  // eslint-disable-next-line no-undef
  console.log('👀 监听模式已启用');
}

export default config;
