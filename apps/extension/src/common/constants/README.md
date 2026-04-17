# 常量管理指南

本目录用于统一管理项目中使用的所有常量定义，遵循模块化和类型安全的设计原则。

## 📁 文件结构

```
constants/
├── constants.ts                  # 通用常量（文件夹、文件名、快捷键等）
├── constants.isoft.ts            # ISoft 业务相关枚举和常量
├── constants.storage.ts          # 存储键名常量（工作区键、前缀键、全局状态）
├── constants.table.ts            # 数据库表名常量
├── constants.context.ts          # 上下文类型定义
├── constants.integrations.ts     # 集成配置常量
├── constants.are.ts              # ARE 相关常量（路径、生成类型、JSON 文件）
├── constants.shell.ts            # Shell 和终端相关常量（WSL、命令模板等）
├── constants.project.ts          # 项目相关常量（项目类型、平台、AUTOSAR 标准）
├── constants.config.ts           # 配置相关常量（配置代码、模板版本）
├── index.ts                      # 统一导出入口
├── README.md                     # 本文档（使用指南）
├── ARCHITECTURE.md               # 架构设计文档
└── SUMMARY.md                    # 架构总结
```

## 设计原则

### 1. 按功能域分离

每个文件负责特定功能域的常量，保持职责单一：

- **通用常量** → `constants.ts`
- **业务枚举** → `constants.isoft.ts`
- **ARE 配置** → `constants.are.ts`
- **项目类型和平台** → `constants.project.ts`
- **配置管理** → `constants.config.ts`

### 2. 使用不可变对象

使用 `Object.freeze()` 和 `as const` 创建不可变常量对象：

```typescript
export const arePath = Object.freeze({
  install: '/isoft/are/install',
  export: 'C:\\isoft\\export\\are'
} as const);
```

### 3. 提供类型定义

为常量对象提供配套的类型定义：

```typescript
export type ArePathKey = keyof typeof arePath;
export type GenerateType = (typeof generateType)[keyof typeof generateType];
```

### 4. 向后兼容

对于需要重构的旧常量，提供兼容导出：

```typescript
/**
 * @deprecated 建议使用 arePath.install 替代
 */
export const defaultAreInstallPath = arePath.install;
```

## 📖 使用方式

### 方式一：从统一入口导入（推荐）

```typescript
import {
  generateType,
  arePath,
  areJsonFile,
  quickPickLabel,
  ISoftNodeType,
  EWorkspaceKey,
  EPrefixKey,
  shellCommand,
  EProjectType,
  platform,
  autosarVersion,
  configKey
} from '@/common/constants';

// 使用常量
const type = generateType.full;
const path = arePath.install;
const jsonFile = areJsonFile.full;
const key = EWorkspaceKey.ALL_PROJECT;
const initCmd = shellCommand.wslInit;
const projectType = EProjectType.INTEGRATED;
const platformType = platform.ap;
const version = autosarVersion.r23_11;
```

### 方式二：从具体文件导入

```typescript
import { generateType, arePath } from '@/common/constants/constants.are';
import { ISoftNodeType } from '@/common/constants/constants.isoft';
```

## 📝 代码示例

### 示例 1：使用 ARE 常量

```typescript
import { generateType, generateTypeDesc, arePath, areJsonFile } from '@/common/constants';

function createPackage(type: string) {
  switch (type) {
    case generateType.full:
      console.log(generateTypeDesc.full);
      const configFile = areJsonFile.full; // 'Full.json'
      return buildFullPackage(arePath.install, configFile);

    case generateType.middle:
      console.log(generateTypeDesc.middle);
      const middleConfig = areJsonFile.middle; // 'Middle.json'
      return buildMiddlePackage(middleConfig);

    case generateType.application:
      console.log(generateTypeDesc.application);
      const appConfig = areJsonFile.application; // 'Application.json'
      return buildAppPackage(appConfig);
  }
}
```

### 示例 2：使用快速选择标签

```typescript
import { quickPickLabel } from '@/common/constants';

const items = [
  { label: quickPickLabel.functionGroup, value: 'fg' },
  { label: quickPickLabel.stateMachine, value: 'sm' }
];
```

### 示例 3：使用文件和路径常量

```typescript
import { areFile, arePath, areJsonFile } from '@/common/constants';
import * as path from 'path';

// 文件路径
const manifestPath = path.join(projectDir, areFile.depManifest);
const dltDbPath = path.join(projectDir, areFile.dltDb);
const monitorFile = areFile.areCmdSysMonitor;

// ARE 配置路径
const exportPath = path.join(projectDir, arePath.exportPath);
const configJsonPath = path.join(projectDir, arePath.configJsonPath);
const fullJsonPath = path.join(configJsonPath, areJsonFile.full);
```

### 示例 4：项目类型和平台

```typescript
import { EProjectType, platform, platformPrefix, autosarVersion, autosarStandards } from '@/common/constants';

class ProjectManager {
  // 创建项目
  createProject(type: EProjectType, platformType: string) {
    console.log(`创建项目类型: ${type}`);

    if (platformType === platform.ap) {
      const prefix = platformPrefix.ap;
      console.log(`使用自适应平台路径: ${prefix.join('/')}`);
    } else if (platformType === platform.cp) {
      const prefix = platformPrefix.cp;
      console.log(`使用经典平台路径: ${prefix.join('/')}`);
    }
  }

  // 检查 AUTOSAR 版本支持
  checkVersionSupport(version: string) {
    const description = autosarStandards[version as keyof typeof autosarStandards];
    console.log(`${version}: ${description}`);
  }
}

// 使用
const manager = new ProjectManager();
manager.createProject(EProjectType.INTEGRATED, platform.ap);
manager.checkVersionSupport(autosarVersion.r23_11);
```

### 示例 5：配置管理

```typescript
import { ECode, ECodeName, configKey } from '@/common/constants';

class ConfigManager {
  // 获取配置代码
  getConfigCode(): string {
    return ECode.SETTING_TAB_MENU; // 'setting.tab.menu#1'
  }

  // 获取配置名称
  getConfigName(): string {
    return ECodeName.SETTING_TAB_MENU; // '状态监控'
  }

  // 保存设置
  async saveSetting(context: any, value: any) {
    await context.workspaceState.update(configKey.setting, value);
  }

  // 获取模板版本
  getTemplateVersion(context: any): string {
    return context.workspaceState.get(configKey.templateVersion, '1.0.0');
  }
}
```

### 示例 6：类型安全的常量使用

```typescript
import type { GenerateType, QuickPickLabel, PlatformType, AutosarVersionType } from '@/common/constants';

function processGenerateType(type: GenerateType) {
  // TypeScript 会确保 type 只能是有效的生成类型值
  console.log(`Processing type: ${type}`);
}

function selectPlatform(platformType: PlatformType) {
  // 类型安全的平台选择
  console.log(`Selected platform: ${platformType}`);
}

// 正确 ✓
processGenerateType('完整版');
selectPlatform('AP');

// 错误 ✗ - TypeScript 编译错误
// processGenerateType('无效类型');
// selectPlatform('INVALID');
```

## ✨ 最佳实践

### 1. 使用新的结构化常量

✅ 推荐：

```typescript
import { generateType, arePath } from '@/common/constants';
```

### 2. 利用 TypeScript 类型系统

```typescript
import type { GenerateType, ArePathKey } from '@/common/constants';

// 类型安全的函数签名
function getPath(key: ArePathKey): string {
  return arePath[key];
}
```

### 3. 使用枚举表示状态

```typescript
import { ISoftNodeType, ISoftHandleType } from '@/common/constants';

class NodeHandler {
  handleNode(type: ISoftNodeType, action: ISoftHandleType) {
    // 使用枚举提供智能提示和类型检查
    if (type === ISoftNodeType.Root && action === ISoftHandleType.Update) {
      // 处理根节点更新
    }
  }
}
```

## 🔧 添加新常量

当需要添加新常量时，请遵循以下步骤：

### 1. 确定常量类型和归属

- **业务逻辑相关** → 考虑创建新的 `constants.xxx.ts` 文件
- **通用配置** → 添加到 `constants.ts`
- **枚举类型** → 添加到相应的枚举文件

### 2. 创建常量对象

```typescript
// constants.xxx.ts
export const myFeature = Object.freeze({
  option1: 'value1',
  option2: 'value2'
} as const);

export type MyFeatureOption = (typeof myFeature)[keyof typeof myFeature];
```

### 3. 在 index.ts 中导出

```typescript
// index.ts
export * from './constants.xxx';
```

### 4. 添加文档和示例

在本 README 中添加使用示例。

## 迁移指南

如果您的代码使用了旧的常量命名，请参考以下迁移表：

| 旧常量                         | 新常量                                   | 说明                  |
| ------------------------------ | ---------------------------------------- | --------------------- |
| `GENERATE_TYPE_FULL`           | `generateType.full`                      | 生成类型-完整版       |
| `GENERATE_TYPE_MIDDLE`         | `generateType.middle`                    | 生成类型-中间件增量版 |
| `GENERATE_TYPE_APPLICATION`    | `generateType.application`               | 生成类型-应用增量版   |
| `DefaultAreInstallPath`        | `arePath.install`                        | ARE 安装路径          |
| `DefaultAreExportPath`         | `arePath.export`                         | ARE 导出路径          |
| `PresetDeviceName`             | `device.presetName`                      | 预置设备名称          |
| `QuickPickLabel_FunctionGroup` | `quickPickLabel.functionGroup`           | 功能组标签            |
| `QuickPickLabel_StateMachine`  | `quickPickLabel.stateMachine`            | 状态机标签            |
| `Dlt_DB_PATH`                  | `areFile.dltDb`                          | DLT 数据库路径        |
| `DepManifestFileName`          | `areFile.depManifest`                    | 依赖清单文件名        |
| `AreCmdSysMonitorFileName`     | `areFile.areCmdSysMonitor`               | 系统监控文件名        |
| `SDK_INSTALL_DIR`              | `sdkInstallDir`                          | SDK 安装目录          |
| `INIT_SHELL`                   | `wslInitShell` 或 `shellCommand.wslInit` | WSL 初始化命令        |
| `ARE_EXPORT_PATH`              | `arePath.exportPath`                     | ARE 导出路径          |
| `ARE_CONFIG_JSON_PATH`         | `arePath.configJsonPath`                 | ARE 配置 JSON 路径    |
| `ARE_CONFIG_PATH`              | `arePath.configPath`                     | ARE 配置路径          |
| `ARE_JSON_FULL`                | `areJsonFile.full`                       | 完整版 JSON 文件      |
| `ARE_JSON_MIDDLE`              | `areJsonFile.middle`                     | 中间件 JSON 文件      |
| `ARE_JSON_APPLICATION`         | `areJsonFile.application`                | 应用 JSON 文件        |
| `Platform_AP_Prefix`           | `platformPrefix.ap`                      | AP 平台路径前缀       |
| `Platform_CP_Prefix`           | `platformPrefix.cp`                      | CP 平台路径前缀       |
| `AP`                           | `platform.ap`                            | 自适应平台标识        |
| `CP`                           | `platform.cp`                            | 经典平台标识          |
| `AL`                           | `platform.al`                            | 全部平台标识          |
| `AUTOSAR_R23_11`               | `autosarVersion.r23_11`                  | AUTOSAR R23-11        |
| `AUTOSAR_R20_11`               | `autosarVersion.r20_11`                  | AUTOSAR R20-11        |
| `AUTOSAR_R19_11`               | `autosarVersion.r19_11`                  | AUTOSAR R19-11        |
| `AutosarStandards`             | `autosarStandards`                       | AUTOSAR 标准描述      |
| `SETTING_CODE`                 | `configKey.setting`                      | 设置代码              |
| `TEMPLATE_CODE`                | `configKey.templateVersion`              | 模板版本代码          |
| `WORKSPACE`                    | `configKey.workspaceGlobal`              | 工作区全局配置        |

## 📚 相关资源

- [TypeScript Const Assertions](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-4.html#const-assertions)
- [TypeScript Enums](https://www.typescriptlang.org/docs/handbook/enums.html)
- [Object.freeze()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
