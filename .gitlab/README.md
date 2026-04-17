# Git Hooks 完整指南

> 本地 Git Hooks 配置，用于在提交/推送前执行代码检查，与 GitLab CI/CD 保持一致

## 📋 目录

- [快速开始](#-快速开始)
- [安装指南](#-安装指南)
- [Git Hooks 说明](#-git-hooks-说明)
  - [commit-msg Hook](#1-commit-msg-hook)
  - [pre-commit Hook](#2-pre-commit-hook)
  - [pre-push Hook](#3-pre-push-hook)
- [ESLint 集成](#-eslint-集成)
- [服务器端 Hooks](#-服务器端-hooks)
- [快速参考](#-快速参考)
- [故障排除](#-故障排除)
- [更新日志](#-更新日志)

---

## 快速开始

### 一分钟上手

```bash
# 1. 安装 npm（如果还没有）
npm install -g npm

# 2. 安装依赖
npm install

# 3. 安装 Git hooks
bash .gitlab/install-hooks.sh

# 4. 开始开发
npm run lint    # 代码检查
npm run build   # 构建项目
npm run test    # 运行测试(当前还没规划)
```

### 提交消息规范

**格式**：`<type>(<scope>): <subject>`

**示例**：

```bash
✅ git commit -m "feat(auth): 实现JWT认证"
✅ git commit -m "fix(api): 修复接口超时问题"
✅ git commit -m "docs: 更新README文档"
✅ git commit -m "perf(query): 优化数据库查询性能"

❌ git commit -m "update"
❌ git commit -m "修复bug"
❌ git commit -m "更新代码"
```

**支持的类型**：

- `feat` - 新功能
- `fix` - Bug 修复
- `perf` - 性能优化
- `docs` - 文档更新
- `style` - 代码格式调整
- `refactor` - 代码重构
- `test` - 测试相关
- `build` - 构建系统
- `chore` - 其他修改
- `ci` - CI 配置
- `revert` - 回滚
- `localize` - 国际化
- `deps` - 依赖更新

---

## 📦 安装指南

### Windows 用户

#### 方法 1：使用 PowerShell

```powershell
.\.gitlab\install-hooks.ps1
```

#### 方法 2：使用 Git Bash

```bash
bash .gitlab/install-hooks.sh
```

#### 方法 3：手动安装

```powershell
Copy-Item ".gitlab\hooks\*" ".git\hooks\" -Force
```

### Linux/macOS 用户

```bash
bash .gitlab/install-hooks.sh
```

或者：

```bash
chmod +x .gitlab/install-hooks.sh
./.gitlab/install-hooks.sh
```

### 安装确认

安装完成后，您应该看到：

```
✅ 安装完成！

统计信息：
   已安装: 3

📖 Hooks 说明：
   commit-msg - 在提交时检查提交消息格式
   pre-commit - 在提交前检查代码质量
   pre-push - 在推送前进行最后检查
```

---

## Git Hooks 说明

### 概述

本项目包含 3 个 Git hooks，用于在本地执行代码检查：

| Hook           | 触发时机        | 检查内容           |
| -------------- | --------------- | ------------------ |
| **commit-msg** | `git commit`    | 提交消息格式       |
| **pre-commit** | `git commit` 前 | 代码质量检查       |
| **pre-push**   | `git push` 前   | 分支保护、提交格式 |

### 1. commit-msg Hook

#### 触发时机

执行 `git commit` 时

#### 检查内容

- ✓ 提交消息格式是否符合约定式提交规范
- ✓ 提交类型是否有效
- ✓ 跳过 Merge 和 Revert 提交

#### 格式要求

```
<type>(<scope>): <subject>
```

#### 示例输出

**成功**：

```bash
🔍 检查提交消息格式...
✅ 提交消息格式正确
```

**失败**：

```bash
🔍 检查提交消息格式...
❌ 提交消息格式错误！

📖 提交消息格式要求:
   格式: <type>(<scope>): <subject>
   类型: feat|fix|perf|build|chore|docs|style|refactor|test|revert|ci|localize|deps

💡 正确示例:
   feat(user): 添加用户登录功能
   fix(auth): 修复登录验证bug
   docs: 更新API文档

🚫 当前错误格式: update code
```

---

### 2. pre-commit Hook

#### 触发时机

执行 `git commit` 前

#### 检查内容

| #   | 检查项          | 说明                                                         |
| --- | --------------- | ------------------------------------------------------------ |
| 1   | 冲突标记        | 精确检测 Git 冲突标记（不误报文档分隔线）                    |
| 2   | 调试代码        | **已禁用** - console.log 和 debugger 都允许使用 ✅           |
| 3   | 文件大小        | 限制单个文件不超过 100MB                                     |
| 4   | 敏感信息        | 检测真实的密钥/密码赋值（排除类型定义）                      |
| 5   | 禁止文件        | 阻止 `.env`, `.DS_Store`, `*.log` 等                         |
| 6   | **ESLint 检查** | 检查 JS/TS/Vue 代码规范 + Prettier 格式 ⭐（允许 20 个警告） |
| 7   | Prettier 检查   | 代码格式检查（可选）                                         |

#### 示例输出

```bash
🔍 执行提交前检查...
📝 检查文件列表:
   src/components/MyComponent.vue
   src/utils/helper.js

[1/6] 检查冲突标记...
✓ 通过

[2/6] 检查调试代码...
✓ 通过

[3/6] 检查文件大小...
✓ 通过

[4/6] 检查敏感信息...
✓ 通过

[5/6] 检查禁止提交的文件...
✓ 通过

[6/7] ESLint 代码检查...
检测到 ESLint 配置，检查以下文件：
   src/components/MyComponent.vue
   src/utils/helper.js

✓ ESLint 检查通过

[7/7] 代码格式检查...
✓ 跳过

================================
✅ 提交前检查全部通过！
```

---

### 📌 冲突标记检查说明

#### 什么是 Git 冲突标记？

Git 合并冲突时会自动插入的特殊标记：

#### 检查规则

新的精确检查规则：

- `<<<<<<< ` - 7个小于号 + 空格 + 分支名
- `=======` - **正好7个**等号，单独一行
- `>>>>>>> ` - 7个大于号 + 空格 + 分支名

#### ✅ 不会误报的情况

```markdown
# ✅ 文档分隔线 - 不检查

================================ (32个等号)
---------------------------- (短横线)

# ✅ 代码注释 - 不检查

// =================================
/_ ================================= _/

# ⚠️ 真正的冲突标记 - 会阻止提交
```

---

### 3. pre-push Hook

#### 触发时机

执行 `git push` 前

#### 检查内容

| #   | 检查项     | 说明                                                            |
| --- | ---------- | --------------------------------------------------------------- |
| 1   | 保护分支   | 禁止直接推送到 `master`, `dev`, `main`, `production`, `release` |
| 2   | 分支命名   | 建议使用 `feature/`, `bugfix/`, `hotfix/` 等                    |
| 3   | 未提交修改 | 检查是否有未提交的修改                                          |
| 4   | 远程更新   | 检查远程分支是否有更新                                          |
| 5   | 提交消息   | 验证所有提交消息格式                                            |

#### 示例输出

```bash
🚀 执行推送前检查...

📌 当前分支: feature/user-login

[1/5] 检查保护分支...
✓ 通过

[2/5] 检查分支命名规范...
✓ 通过

[3/5] 检查未提交的修改...
✓ 通过

[4/5] 检查远程更新...
✓ 本地和远程同步

[5/5] 验证所有提交消息格式...
📝 检查以下提交：
   abc1234 feat(user): 添加用户登录功能
   def5678 fix(auth): 修复验证bug

✓ 所有提交消息格式正确

================================
✅ 推送前检查全部通过！

🚀 准备推送到 GitLab...
```

---

## ⚡ ESLint 集成

### 功能说明

Pre-commit hook 现在会自动检查待提交的 JavaScript/TypeScript 代码！

### 🎯 检查范围

#### 自动检查的文件类型

- `.js` - JavaScript
- `.jsx` - React JSX
- `.ts` - TypeScript
- `.tsx` - TypeScript JSX
- `.vue` - Vue 单文件组件

#### 检查时机

- ✅ **仅在提交时** - 执行 `git commit`
- ✅ **只检查 staged 文件** - 只检查即将提交的代码
- ✅ **不检查全部代码** - 不影响其他未修改的文件

### 📋 工作流程

#### 正常流程（代码无错误）

```bash
# 1. 修改代码
vim src/components/MyComponent.vue

# 2. 添加到暂存区
git add src/components/MyComponent.vue

# 3. 提交（会自动运行 ESLint 检查）
git commit -m "feat(component): 添加新组件"

# 输出：
[6/7] ESLint 代码检查...
检测到 ESLint 配置，检查以下文件：
   src/components/MyComponent.vue

✓ ESLint 检查通过
✅ 提交前检查全部通过！
```

#### 有 ESLint 错误时

```bash
git commit -m "feat(component): 添加新组件"

# 输出：
[6/7] ESLint 代码检查...
检测到 ESLint 配置，检查以下文件：
   src/components/MyComponent.vue

src/components/MyComponent.vue
  10:5  error  'console' is not defined  no-undef
  15:3  error  Missing semicolon         semi

✗ ESLint 检查失败

💡 修复建议：
   1. 运行 npm run lint 或 npm lint 查看所有问题
   2. 运行 npm run lint:fix 或 npm lint:fix 自动修复
   3. 手动修复后重新提交
   4. 如确需跳过: git commit --no-verify

✗ 提交前检查失败！
```

### 🔒 敏感信息检查说明

#### 检查内容

敏感信息检查会检测以下关键词的**赋值语句**：

- `password`, `passwd`, `pwd`
- `secret`
- `api_key`, `apikey`
- `private_key`, `access_key`
- `SECRET_KEY`, `API_KEY`

#### ✅ 不会误报的情况

以下合法代码**不会**被检测为敏感信息：

```typescript
// ✅ 类型定义 - 不检查
import { CancellationToken } from 'vscode';
const token: CancellationToken;
const api_key: string;
const apiKey: ApiKey;
type RefreshToken = string;
type APIKey = string;
interface AccessToken { ... }

// ✅ 短字符串 - 不检查（少于8个字符）
const secret = "test";

// ✅ 变量名包含关键词但不是赋值 - 不检查
function getPassword() { ... }
function getApiKey() { ... }
const passwordField = document.getElementById('password');
```

#### ⚠️ 会触发警告的情况

以下代码**会**触发敏感信息警告：

```typescript
// ⚠️ 硬编码的密钥
const api_key = 'sk-1234567890abcdef';
const password = 'mypassword123';
const SECRET_KEY = 'super-secret-key-value';
```

#### 建议做法

如果确实需要使用敏感信息：

1. 使用环境变量：`process.env.API_KEY`
2. 使用配置文件（不提交到 Git）
3. 使用密钥管理服务

---

### 🔧 配置要求

#### 1. package.json 中需要包含 ESLint

```json
{
  "devDependencies": {
    "eslint": "^8.x.x"
  },
  "scripts": {
    "lint": "eslint . --ext .js,.jsx,.ts,.tsx,.vue",
    "lint:fix": "eslint . --ext .js,.jsx,.ts,.tsx,.vue --fix"
  }
}
```

#### 2. 项目根目录需要 ESLint 配置文件

以下任一文件：

- `.eslintrc.js`
- `.eslintrc.json`
- `.eslintrc.yml`
- `.eslintrc.yaml`
- `eslint.config.js` (ESLint 9+)
- `package.json` 中的 `eslintConfig` 字段

### 💡 使用建议

#### 自动修复 ESLint 错误

```bash
# 使用 npm
npm run lint:fix

# 使用 npm
npm lint:fix

# 使用 npx（临时）
npx eslint --fix src/components/MyComponent.vue
```

#### 查看所有 ESLint 问题

```bash
# 检查整个项目
npm run lint

# 检查特定文件
npx eslint src/components/MyComponent.vue
```

#### 临时跳过检查

如果确实需要提交（不推荐）：

```bash
git commit --no-verify -m "feat: 临时提交"
```

### ⚙️ 自定义配置

#### 调整 ESLint 警告级别

默认配置：`--max-warnings 20`（允许 20 个警告，包括 Prettier 格式化警告）

如果需要调整，修改以下文件：

- `package.json` - lint 脚本
- `.gitlab/hooks/pre-commit` - 源文件
- `.git/hooks/pre-commit` - 已安装的 hook

```bash
# 当前配置（宽松）
echo "$JS_FILES" | xargs npx eslint --max-warnings 20

# 修改为更严格（10 个警告）
echo "$JS_FILES" | xargs npx eslint --max-warnings 10

# 或完全允许警告（只阻止错误）
echo "$JS_FILES" | xargs npx eslint
```

#### 关于 Prettier 集成

项目 ESLint 配置中集成了 Prettier 格式化检查：

```javascript
// eslint.config.mjs
'prettier/prettier': 'warn'  // Prettier 格式问题会产生警告
```

**常见 Prettier 警告：**

- `Insert '··'` - 缺少缩进空格
- `Delete '·'` - 多余的空格
- `Replace '...' with '...'` - 格式需要调整

**快速修复：**

```bash
# 自动格式化所有代码
npm run format

# 自动格式化特定文件
npm run format packages/extension/src/common/promise.ts
```

#### 禁用 ESLint 检查

编辑 `.gitlab/hooks/pre-commit`，注释掉整个 ESLint 检查部分：

```bash
# ========================================
# 6. ESLint 检查（仅检查待提交的文件）
# ========================================
# echo "${BLUE}[6/7]${NC} ESLint 代码检查..."
# ... 整个部分都注释掉
```

### 🎨 与 Prettier 配合

如果项目同时使用 ESLint 和 Prettier：

#### 1. 安装兼容插件

```bash
npm install -D eslint-config-prettier eslint-plugin-prettier
```

#### 2. 配置 .eslintrc.js

```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended' // 最后添加
  ]
};
```

#### 3. 启用 Prettier 检查（可选）

在 `.gitlab/hooks/pre-commit` 中取消注释 Prettier 检查部分。

---

## 🌐 服务器端 Hooks

### 📋 简介

服务器端 Git Hooks 在 GitLab 服务器端强制执行代码规范检查。

**优势**：

- ✅ 在服务器端执行，无法被 `--no-verify` 绕过
- ✅ 所有开发者统一执行相同的规则
- ✅ 在 push 阶段就拒绝不符合规范的代码

### 🚀 快速安装

#### 前提条件

- GitLab 自托管版本
- 服务器 root 或管理员权限
- SSH 访问 GitLab 服务器

#### 安装步骤

##### 1. 上传脚本到 GitLab 服务器

```bash
# 在本地
scp -r .gitlab/server-hooks admin@gitlab-server.com:/tmp/

# 或使用 rsync
rsync -avz .gitlab/server-hooks/ admin@gitlab-server.com:/tmp/server-hooks/
```

##### 2. SSH 登录到 GitLab 服务器

```bash
ssh admin@gitlab-server.com
```

##### 3. 运行安装脚本

```bash
cd /tmp/server-hooks

# 安装到指定项目
# 格式: sudo bash install.sh <namespace> <project>
sudo bash install.sh mygroup myproject

# 示例
sudo bash install.sh john/subgroup awesome-project
```

##### 4. 验证安装

```bash
# 在本地仓库测试
git commit -m "update code"
git push origin test-branch

# 预期结果：push 被拒绝
# remote: ❌ 错误: 提交消息格式不正确
# remote: error: hook declined
```

### 📋 Server Hook 功能

#### 检查项目

| #   | 检查项       | 说明                                         |
| --- | ------------ | -------------------------------------------- |
| 1   | 提交消息格式 | 必须遵循约定式提交规范                       |
| 2   | 文件大小限制 | 单个文件不超过 100MB                         |
| 3   | 敏感文件检测 | 禁止 `.env`, `.key`, `.pem` 等               |
| 4   | 分支命名规范 | 要求 `feature/`, `bugfix/`, `hotfix/` 等格式 |

### 🛠️ 管理 Hook

#### 查看 Hook

```bash
cat /var/opt/gitlab/git-data/repositories/<namespace>/<project>.git/custom_hooks/pre-receive
```

#### 临时禁用 Hook

```bash
sudo mv pre-receive pre-receive.disabled
```

#### 重新启用 Hook

```bash
sudo mv pre-receive.disabled pre-receive
```

#### 卸载 Hook

```bash
sudo rm pre-receive
```

---

## 🎨 VSCode 编辑器集成（推荐）

### 📦 安装 VSCode 扩展

项目已配置 `.vscode/extensions.json`，打开项目时 VSCode 会自动提示安装推荐扩展：

1. **ESLint** (`dbaeumer.vscode-eslint`) - 代码质量检查
2. **Prettier** (`esbenp.prettier-vscode`) - 代码格式化
3. **Vue Volar** (`Vue.volar`) - Vue 3 支持
4. **EditorConfig** (`EditorConfig.EditorConfig`) - 编辑器配置

#### 手动安装

```bash
# 打开命令面板 (Ctrl+Shift+P 或 Cmd+Shift+P)
# 输入: Extensions: Show Recommended Extensions
# 点击 "Install All" 安装全部推荐扩展
```

或使用命令行：

```bash
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension Vue.volar
code --install-extension EditorConfig.EditorConfig
```

### ⚙️ VSCode 配置（已自动生效）

项目已配置 `.vscode/settings.json`，包含以下设置：

#### ✅ 保存时自动格式化

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

#### ✅ 保存时自动修复 ESLint 问题

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  }
}
```

#### ✅ ESLint 支持的文件类型

```json
{
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact", "vue"]
}
```

### 🎯 使用效果

安装扩展并配置后：

1. **编辑代码时** - ESLint 实时显示问题（红色波浪线 = 错误，黄色 = 警告）
2. **保存文件时** - 自动运行 Prettier 格式化
3. **保存文件时** - 自动修复可修复的 ESLint 问题
4. **无需手动运行命令** - 一切都是自动的！✨

### 🔧 故障排除

#### ESLint 不工作？

```bash
# 1. 重启 ESLint 服务器
Ctrl+Shift+P → "ESLint: Restart ESLint Server"

# 2. 检查输出面板
Ctrl+Shift+U → 选择 "ESLint" 查看错误信息

# 3. 确认 ESLint 已安装
npm install
```

#### Prettier 不格式化？

```bash
# 1. 检查是否有 .prettierrc.js 文件
ls -la .prettierrc.js

# 2. 手动格式化
右键 → Format Document
或 Shift+Alt+F (Windows) / Shift+Option+F (Mac)

# 3. 设置默认格式化工具
Ctrl+Shift+P → "Format Document With..." → "Configure Default Formatter" → "Prettier"
```

---

## 📚 快速参考

### 🔧 常用命令

#### npm 命令

```bash
npm install          # 安装依赖
npm add <package>    # 添加依赖
npm run lint        # 代码检查
npm run lint:fix    # 自动修复
npm run build       # 构建项目
npm run test        # 运行测试
```

#### Git 命令

```bash
git status                           # 查看状态
git add .                           # 暂存所有更改
git commit -m "type: message"       # 提交（遵循规范）
git push                            # 推送（触发 CI/CD）
git push --no-verify                # 跳过 pre-push hook
git commit --no-verify              # 跳过 commit hooks
```

#### Hook 管理命令

```bash
# 重新安装 hooks
bash .gitlab/install-hooks.sh

# 查看已安装的 hooks
ls -la .git/hooks/

# 卸载 hooks
rm .git/hooks/commit-msg
rm .git/hooks/pre-commit
rm .git/hooks/pre-push
```

### 💡 最佳实践

#### 开发流程

1. ✅ 创建功能分支
2. ✅ 小步提交（每个功能一次提交）
3. ✅ 遵循提交规范
4. ✅ 本地运行 lint 和 test
5. ✅ 推送前检查状态
6. ✅ 创建 Merge Request
7. ✅ 等待 CI/CD 通过
8. ✅ Code Review
9. ✅ 合并到主分支

#### 提交建议

- ✅ 使用清晰的描述
- ✅ 一次提交只做一件事
- ✅ 避免过大的提交
- ✅ 提交前运行测试

#### 避免的做法

- ❌ 不遵循提交规范
- ❌ 跳过 CI/CD 检查
- ❌ 直接推送到主分支
- ❌ 提交未测试的代码
- ❌ 强制推送到共享分支

---

## 🐛 故障排除

### Hooks 不执行

**可能原因**：

1. Hooks 文件没有执行权限
2. Git 配置问题
3. Windows 下缺少 Git Bash

**解决方案**：

```bash
# 1. 检查 hooks 是否有可执行权限
chmod +x .git/hooks/*

# 2. 检查 Git 配置
git config core.hooksPath
# 应该为空或指向 .git/hooks

# 3. Windows 用户确保已安装 Git for Windows
```

### 提交格式错误

**问题**：提交时提示格式错误

**解决方案**：

```bash
# 修改最后一次提交
git commit --amend -m "feat: 正确的格式"

# 或重新提交
git reset HEAD~1
git commit -m "feat: 正确的格式"
```

### ESLint 检查失败

**问题**：提交时 ESLint 检查失败

**解决方案**：

```bash
# 1. 查看所有 ESLint 问题
npm run lint

# 2. 自动修复（推荐）
npm run lint:fix

# 3. 手动修复后重新提交
git add .
git commit -m "fix: 修复代码规范问题"
```

### ESLint 未找到

**问题**：提示未找到 npx 或 ESLint

**解决方案**：

```bash
# 更新 Node.js 和 npm
npm install -g npm@latest

# 安装项目依赖
npm install

# 或安装 npm
npm install -g npm
npm install
```

### Push 被服务器拒绝

**问题**：`remote: error: hook declined`

**解决方案**：

```bash
# 1. 查看错误消息
# GitLab 会显示详细的拒绝原因

# 2. 提交格式错误
git commit --amend -m "feat: 正确的提交格式"
git push

# 3. 文件过大
git reset HEAD~1
# 删除或压缩大文件
git commit -m "feat: 优化后的提交"
git push

# 4. 敏感文件
git rm --cached .env
echo ".env" >> .gitignore
git commit -m "fix: 移除敏感文件"
git push
```

### 不能推送到保护分支

**问题**：推送时提示不能推送到保护分支

**解决方案**：

```bash
# 创建功能分支
git checkout -b feature/your-feature

# 推送功能分支
git push origin feature/your-feature

# 在 GitLab 上创建 Merge Request
```

### Windows 下执行错误

**问题**：Windows 下 hooks 执行错误

**解决方案**：

1. 确保已安装 Git for Windows（包含 Git Bash）
2. Hooks 需要 sh.exe 执行
3. 使用管理员权限运行安装脚本

---

## 🎉 使用技巧

### 临时跳过 Hooks

如果确实需要跳过检查（不推荐）：

```bash
# 跳过 commit-msg 和 pre-commit
git commit --no-verify -m "消息"

# 跳过 pre-push
git push --no-verify
```

### 修改提交消息

```bash
# 修改最后一次提交
git commit --amend

# 交互式修改历史提交
git rebase -i HEAD~3
```

### 配置编辑器 ESLint 插件

**VS Code**：

```bash
# 安装 ESLint 扩展
code --install-extension dbaeumer.vscode-eslint
```

**配置 settings.json**：

```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact", "vue"]
}
```

---

## 🌟 与 GitLab CI 的关系

本地 Hooks 与 GitLab CI（`.gitlab-ci/commit-check.yml`）使用相同的检查规则：

| 检查项       | 本地 Hooks    | GitLab CI              |
| ------------ | ------------- | ---------------------- |
| 提交消息格式 | ✅ commit-msg | ✅ commit-format-check |
| 代码质量     | ✅ pre-commit | ✅ lint-check          |
| 分支保护     | ✅ pre-push   | ✅ pipeline rules      |

**优势**：

- 本地 Hooks：快速反馈，节省 CI 时间
- GitLab CI：强制执行，无法跳过

**最佳实践**：

1. 本地使用 Hooks 快速检查
2. 推送前确保通过所有检查
3. CI 作为最后一道防线

---

## 📚 相关文档

- [约定式提交规范](https://www.conventionalcommits.org/zh-hans/)
- [Git Hooks 官方文档](https://git-scm.com/docs/githooks)
- [GitLab Server Hooks 文档](https://docs.gitlab.com/ee/administration/server_hooks.html)
- [ESLint 官方文档](https://eslint.org/)
- [项目 CI/CD 配置](../.gitlab-ci/README.md)

---

## ❓ 常见问题

### Q: 为什么需要本地 hooks？

A: 本地 hooks 可以在提交/推送前就发现问题，避免 CI 失败，节省时间。

### Q: 可以不安装 hooks 吗？

A: 可以，但不推荐。不安装 hooks 的代码仍会在 GitLab CI 中被检查，格式错误会导致 CI 失败。

### Q: Hooks 和 CI 检查有什么区别？

A:

- **Hooks**：本地检查，快速反馈，可跳过
- **CI**：服务器端检查，强制执行，无法跳过

### Q: GitLab.com SaaS 版本能用 Server Hooks 吗？

A: 不能。Server Hooks 只能在自托管版本使用。GitLab.com 用户应使用 Push Rules（需要 Premium/Ultimate）。

### Q: 如何为多个项目批量安装 Server Hooks？

A: 可以编写循环脚本：

```bash
for project in project1 project2 project3; do
  sudo bash install.sh mygroup $project
done
```

---

## 🤝 团队协作

### 新成员入职

1. 克隆仓库后立即安装 hooks
2. 阅读本文档了解提交规范
3. 遵循分支命名规范

### 统一规范

- 所有团队成员都应安装 hooks
- 提交前确保通过本地检查
- 遇到问题及时沟通，必要时调整规则

---

## 🎉 开始使用

现在您可以开始提交代码了！Hooks 会自动检查您的提交，确保代码质量。

```bash
# 1. 创建功能分支
git checkout -b feature/my-awesome-feature

# 2. 修改代码
# ... 编辑文件 ...

# 3. 提交代码（会自动检查）
git add .
git commit -m "feat(core): 添加新功能"

# 4. 推送代码（会自动检查）
git push origin feature/my-awesome-feature

# 5. 在 GitLab 上创建 Merge Request
```

**祝编码愉快！快到飞起🚀**

---

**维护者**：工具组IDE  
**文档版本**：1.1.0  
**最后更新**：2025-11-20
