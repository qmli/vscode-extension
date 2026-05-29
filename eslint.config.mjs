// @ts-check
/**
 * ESLint 配置文件 - 工程化管理版本
 * 支持 Extension 与共享 TypeScript 包配置
 */

// 核心依赖导入
import globals from 'globals';
import { includeIgnoreFile } from '@eslint/compat';
import js from '@eslint/js';
import ts from 'typescript-eslint';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import importX from 'eslint-plugin-import-x';
import { fileURLToPath } from 'node:url';
import prettier from 'eslint-plugin-prettier/recommended';
import prettierConfig from 'eslint-config-prettier';

// ==================== 配置常量定义 ====================

/** 默认语言选项配置（不包含类型检查，避免性能问题） */
const defaultLanguageOptions = {
  parserOptions: {
    ecmaVersion: 2023,
    sourceType: 'module',
    ecmaFeatures: { impliedStrict: true }
  }
};

/** 文件匹配模式 */
const filePatterns = {
  extension: [
    'extension/**/*.{js,ts,jsx,tsx}',
    'shared/**/*.{js,ts,jsx,tsx}',
    'packages/utils/**/*.{js,ts,jsx,tsx}',
    'packages/dbdriver/**/*.{js,ts,jsx,tsx}'
  ],
  // 排除自动生成的声明文件
  excludeDeclarations: ['**/*.d.ts', '**/*.d.ts.map']
};

/** 忽略模式 */
const ignorePatterns = {
  default: [
    '**/dist/**',
    '**/node_modules/**',
    '**/coverage/**',
    '**/.cache/**',
    'packages/@types',
    '**/scripts/**',
    'extension/webpack.config.js',
    'extension/gulpfile.js',
    'packages/vscode-core/src/instantiation/**',
    // 根目录配置文件
    '.prettierrc.js',
    'eslint.config.mjs',
    '.vscode-test.mjs'
  ]
};

// ==================== 导入限制配置 ====================

/** 导入限制规则配置 */
const restrictedImports = {
  /** Extension环境限制 */
  extension: [
    'error',
    {
      patterns: [
        { group: ['**/extension/webview/**/*'], message: 'Extension中不能使用webview模块' },
        {
          regex: '^(?:\\.\\./)+(?:common|utils|@types)(?:/|$)',
          message: '在webview中请使用别名导入（如 @shared），禁止跨包相对路径'
        }
      ]
    }
  ],

  /** Node.js环境最小限制 */
  node: ['error', { paths: [] }]
};

// ==================== 公共规则配置 ====================

/** 基础JavaScript/TypeScript规则 */
const baseJsRules = {
  curly: ['error', 'multi-line', 'consistent'],
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'no-constant-condition': ['warn', { checkLoops: false }],
  'no-constant-binary-expression': 'error',
  'no-caller': 'error',
  'no-debugger': 'off',
  'no-else-return': 'warn',
  'no-empty': ['warn', { allowEmptyCatch: true }],
  'no-eval': 'error',
  'no-extend-native': 'error',
  'no-extra-bind': 'error',
  'no-extra-semi': 'off',
  'no-floating-decimal': 'error',
  'no-implicit-coercion': 'error',
  'no-implied-eval': 'error',
  'no-inner-declarations': 'off',
  'no-lone-blocks': 'error',
  'no-lonely-if': 'error',
  'no-loop-func': 'error',
  'no-mixed-spaces-and-tabs': 'off',
  'no-restricted-globals': ['error', 'process'],
  'no-return-assign': 'error',
  'no-return-await': 'warn',
  'no-self-compare': 'error',
  'no-sequences': 'error',
  'no-template-curly-in-string': 'warn',
  'no-throw-literal': 'error',
  'no-unmodified-loop-condition': 'warn',
  'no-unneeded-ternary': 'error',
  'no-unused-expressions': 'error',
  'no-use-before-define': 'off',
  'no-useless-call': 'error',
  'no-useless-catch': 'error',
  'no-useless-computed-key': 'error',
  'no-useless-concat': 'error',
  'no-useless-rename': 'error',
  'no-useless-return': 'error',
  'no-var': 'error',
  'no-with': 'error',
  'object-shorthand': ['error', 'never'],
  'one-var': ['error', 'never'],
  'prefer-arrow-callback': 'error',
  'prefer-const': ['error', { destructuring: 'all', ignoreReadBeforeAssign: true }],
  'prefer-numeric-literals': 'error',
  'prefer-object-spread': 'error',
  'prefer-promise-reject-errors': 'off',
  'prefer-rest-params': 'error',
  'prefer-spread': 'error',
  'prefer-template': 'error',
  'require-atomic-updates': 'off',
  'sort-imports': [
    'error',
    {
      ignoreCase: true,
      ignoreDeclarationSort: true,
      ignoreMemberSort: false,
      memberSyntaxSortOrder: ['none', 'all', 'multiple', 'single']
    }
  ],
  yoda: 'error',

  // 语法限制规则
  'no-restricted-syntax': [
    'error',
    {
      selector:
        'IfStatement:not(:has(BlockStatement)):not(:has(ReturnStatement)):not(:has(BreakStatement)):not(:has(ContinueStatement)):not(:has(YieldExpression)):not(:has(ThrowStatement))',
      message: '单行if语句只允许用于控制流（return、break、continue、throw、yield）'
    },
    { selector: 'WhileStatement:not(:has(BlockStatement))', message: '不允许单行while语句' },
    { selector: 'ForStatement:not(:has(BlockStatement))', message: '不允许单行for语句' },
    { selector: 'ForInStatement:not(:has(BlockStatement))', message: '不允许单行for-in语句' },
    { selector: 'ForOfStatement:not(:has(BlockStatement))', message: '不允许单行for-of语句' }
  ]
};

/** import-x插件规则 */
const importXRules = {
  'import-x/consistent-type-specifier-style': ['error', 'prefer-top-level'],
  'import-x/default': 'off',
  'import-x/extensions': 'off',
  'import-x/named': 'off',
  'import-x/namespace': 'off',
  'import-x/newline-after-import': 'warn',
  'import-x/no-absolute-path': 'error',
  'import-x/no-cycle': 'off',
  'import-x/no-deprecated': 'off',
  'import-x/no-default-export': 'error',
  'import-x/no-duplicates': ['error', { 'prefer-inline': false }],
  'import-x/no-dynamic-require': 'error',
  'import-x/no-named-as-default': 'off',
  'import-x/no-named-as-default-member': 'off',
  'import-x/no-self-import': 'error',
  'import-x/no-unused-modules': 'off',
  'import-x/no-unresolved': 'off',
  'import-x/no-useless-path-segments': 'error',
  'import-x/order': [
    'error',
    {
      alphabetize: { order: 'asc', orderImportKind: 'asc', caseInsensitive: true },
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'never',
      pathGroups: [
        { pattern: '@/**', group: 'internal', position: 'before' },
        { pattern: '@packages/**', group: 'internal', position: 'before' }
      ],
      pathGroupsExcludedImportTypes: ['builtin']
    }
  ]
};

/** TypeScript规则 */
const tsRules = {
  '@typescript-eslint/consistent-type-assertions': [
    'error',
    {
      assertionStyle: 'as',
      objectLiteralTypeAssertions: 'allow-as-parameter'
    }
  ],
  '@typescript-eslint/consistent-type-imports': ['error', { disallowTypeAnnotations: false }],
  '@typescript-eslint/explicit-module-boundary-types': ['error', { allowArgumentsExplicitlyTypedAsAny: true }],
  '@typescript-eslint/naming-convention': [
    'error',
    {
      selector: 'variable',
      format: ['camelCase', 'PascalCase'],
      leadingUnderscore: 'allow',
      filter: { regex: '^_$', match: false }
    },
    {
      selector: 'variableLike',
      format: ['camelCase'],
      leadingUnderscore: 'allow',
      filter: { regex: '^_$', match: false }
    },
    { selector: 'memberLike', modifiers: ['private'], format: ['camelCase'], leadingUnderscore: 'allow' },
    {
      selector: 'memberLike',
      modifiers: ['private', 'readonly'],
      format: ['camelCase', 'PascalCase'],
      leadingUnderscore: 'allow'
    },
    { selector: 'memberLike', modifiers: ['static', 'readonly'], format: ['camelCase', 'PascalCase'] },
    { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: false } }
  ],
  '@typescript-eslint/no-confusing-void-expression': [
    'error',
    { ignoreArrowShorthand: true, ignoreVoidOperator: true }
  ],
  '@typescript-eslint/no-namespace': 'off',
  '@typescript-eslint/no-duplicate-type-constituents': 'off',
  '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'with-single-extends' }],
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/no-inferrable-types': ['warn', { ignoreParameters: true, ignoreProperties: true }],
  '@typescript-eslint/no-invalid-void-type': 'off',
  '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: false }],
  '@typescript-eslint/no-misused-spread': 'off',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-redundant-type-constituents': 'off',
  '@typescript-eslint/no-unnecessary-condition': 'off',
  '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'off',
  '@typescript-eslint/no-unnecessary-type-parameters': 'off',
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-enum-comparison': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unused-expressions': ['warn', { allowShortCircuit: true }],
  '@typescript-eslint/no-unused-vars': [
    'warn',
    {
      args: 'all',
      argsIgnorePattern: '^_',
      caughtErrors: 'all',
      caughtErrorsIgnorePattern: '^_',
      destructuredArrayIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      ignoreRestSiblings: true
    }
  ],
  '@typescript-eslint/no-use-before-define': ['error', { functions: false, classes: false }],
  '@typescript-eslint/prefer-for-of': 'warn',
  '@typescript-eslint/prefer-includes': 'warn',
  '@typescript-eslint/prefer-literal-enum-member': ['warn', { allowBitwiseExpressions: true }],
  '@typescript-eslint/prefer-optional-chain': 'warn',
  '@typescript-eslint/prefer-promise-reject-errors': ['error', { allowEmptyReject: true }],
  '@typescript-eslint/prefer-reduce-type-parameter': 'warn',
  '@typescript-eslint/restrict-template-expressions': [
    'error',
    {
      allowAny: true,
      allowBoolean: true,
      allowNumber: true,
      allowNullish: true
    }
  ],
  '@typescript-eslint/unbound-method': 'off',
  '@typescript-eslint/unified-signatures': ['error', { ignoreDifferentlyNamedParameters: true }]
};

/** 通用导入解析设置 */
const importSettings = {
  'import-x/extensions': ['.ts', '.tsx'],
  'import-x/parsers': { '@typescript-eslint/parser': ['.ts', '.tsx'] },
  'import-x/resolver-next': [createTypeScriptImportResolver()]
};

// ==================== 初始化 ====================

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

// ==================== 主配置导出 ====================

export default [
  // 基础配置
  includeIgnoreFile(gitignorePath),
  { ignores: ignorePatterns.default },
  js.configs.recommended,
  ...ts.configs.strict, // 使用 strict 而不是 strictTypeChecked，避免类型检查导致的性能问题
  prettierConfig, // 关闭与 Prettier 冲突的 ESLint 规则
  prettier, // 启用 Prettier 插件

  // Extension环境配置（Node.js + TypeScript）
  {
    name: 'extension-typescript',
    files: filePatterns.extension,
    ignores: filePatterns.excludeDeclarations,
    languageOptions: {
      ...defaultLanguageOptions,
      parser: ts.parser,
      globals: globals.node,
      parserOptions: {
        ...defaultLanguageOptions.parserOptions,
        project: ['./extension/tsconfig.json', './tsconfig.json']
      }
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    plugins: { 'import-x': importX },
    rules: {
      ...baseJsRules,
      ...importXRules,
      ...tsRules,
      '@typescript-eslint/no-restricted-imports': restrictedImports.extension,
      'prettier/prettier': 'warn' // 启用 Prettier 格式化警告
    },
    settings: importSettings
  },

  // 特定目录的额外限制（继承前面的 parser 配置）
  {
    name: 'extension-specific-restrictions',
    files: ['extension/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/**/webview/**'], message: 'Extension中不能使用webview模块' },
            {
              regex: '^(?:\\.\\./)+(?:common|utils|@types)(?:/|$)',
              message: '请使用别名导入，禁止跨包相对路径'
            }
          ]
        }
      ]
    }
  },

  // Common和Utils包的架构限制（继承前面的 parser 配置）
  {
    name: 'common-utils-restrictions',
    files: ['shared/**/*.{js,ts}', 'packages/utils/**/*.{js,ts}'],
    ignores: filePatterns.excludeDeclarations,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['**/extension/**'], message: 'common/utils包不能依赖extension模块' },
            { group: ['extension/**'], message: 'common/utils包不能依赖extension模块' }
          ]
        }
      ]
    }
  },

  // vscode-core 基础库（TypeScript）
  {
    name: 'vscode-core-typescript',
    files: ['packages/vscode-core/src/**/*.ts'],
    ignores: [...filePatterns.excludeDeclarations, 'packages/vscode-core/src/instantiation/**'],
    languageOptions: {
      ...defaultLanguageOptions,
      parser: ts.parser,
      globals: globals.node,
      parserOptions: {
        ...defaultLanguageOptions.parserOptions,
        project: ['./packages/vscode-core/tsconfig.json']
      }
    },
    plugins: { 'import-x': importX },
    rules: {
      ...baseJsRules,
      ...importXRules,
      ...tsRules,
      'prettier/prettier': 'warn'
    },
    settings: importSettings
  },

  // vscode-core/commands — 允许 any 类型（泛型基础设施代码）
  {
    name: 'vscode-core-commands-any',
    files: ['packages/vscode-core/src/commands/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off'
    }
  },

  // webview-core — 浏览器环境 TypeScript + Vue
  {
    name: 'webview-core-typescript',
    files: ['packages/webview-core/**/*.{js,ts,tsx}'],
    ignores: filePatterns.excludeDeclarations,
    languageOptions: {
      ...defaultLanguageOptions,
      parser: ts.parser,
      globals: { ...globals.browser },
      parserOptions: {
        ...defaultLanguageOptions.parserOptions,
        project: ['./packages/webview-core/tsconfig.json', './packages/webview-core/tsconfig.node.json']
      }
    },
    plugins: { 'import-x': importX },
    rules: {
      ...baseJsRules,
      ...importXRules,
      ...tsRules,
      // 限制跨包 @packages 引用，内部相对路径不受影响
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@packages/utils/**'], message: 'webview-core 不能引用 @packages/utils，请在包内自行实现' },
            { group: ['@packages/dbdriver/**'], message: 'webview-core 不能引用 @packages/dbdriver' },
            {
              group: ['@packages/vscode-core/**'],
              message: 'webview-core 不能引用 @packages/vscode-core（Node.js 环境库）'
            }
          ]
        }
      ],
      'prettier/prettier': 'warn'
    },
    settings: importSettings
  },

  // webview-core — Vue 单文件组件（无类型信息，需 vue-eslint-parser）
  {
    name: 'webview-core-vue',
    ignores: ['packages/webview-core/**/*.vue']
  },

  // apps — 浏览器环境 TypeScript（webview-example 等前端工程）
  {
    name: 'apps-typescript',
    files: ['apps/**/*.{js,ts,tsx}'],
    ignores: filePatterns.excludeDeclarations,
    languageOptions: {
      ...defaultLanguageOptions,
      parser: ts.parser,
      globals: { ...globals.browser },
      parserOptions: {
        ...defaultLanguageOptions.parserOptions,
        project: [
          './apps/**/tsconfig.json',
          './apps/**/tsconfig.node.json'
          // 未来新增工程时在此添加对应 tsconfig 路径
        ]
      }
    },
    plugins: { 'import-x': importX },
    rules: {
      ...baseJsRules,
      ...importXRules,
      ...tsRules,
      // 限制跨包 @packages 引用，禁止引用 Node.js 环境库
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@packages/dbdriver/**'], message: 'apps 不能引用 @packages/dbdriver' },
            {
              group: ['@packages/vscode-core/**'],
              message: 'apps 不能引用 @packages/vscode-core（Node.js 环境库）'
            }
          ]
        }
      ],
      'prettier/prettier': 'warn'
    },
    settings: importSettings
  },

  // 工具链配置文件 — 必须使用默认导出，豁免 no-default-export 规则
  // 此块必须放在所有业务规则之后，利用 flat config 后者优先的特性覆盖
  {
    name: 'config-files-default-export',
    files: [
      '**/*.config.ts',
      '**/*.config.js',
      '**/*.config.mts',
      '**/*.config.mjs'
    ],
    rules: {
      'import-x/no-default-export': 'off'
    }
  }
];
