# 快速开始指南

> 新同事必读 - 5分钟快速上手项目

## 🚀 一键开始

```bash
# 1. 克隆项目
git clone <repository-url>
cd vscode_extension

# 2. 安装依赖（会自动配置 Git Hooks）
npm install

# 3. 配置 VSCode（推荐）
# VSCode 会提示安装推荐扩展，点击"安装全部"即可
# 包括：ESLint、Prettier、Vue Volar

# 4. 开发模式
npm run dev
```

就这么简单！✨

> 💡 **提示**：安装 VSCode 扩展后，保存文件时会自动格式化和修复代码！

---

## 📋 npm install 做了什么？

执行 `npm install` 后，会**自动**完成以下配置：

### ✅ 自动安装依赖

- 安装所有 npm 包
- 配置 monorepo 工作区
- 链接各个子包

### ✅ 自动安装 Git Hooks

通过 `postinstall` 脚本自动执行 `scripts/install-hooks.js`

**安装的 Hooks：**

- `commit-msg` → 检查提交消息格式
- `pre-commit` → 代码质量检查
  - ESLint 检查（允许最多 20 个警告，包括 Prettier 格式化）
  - **调试代码检查已禁用** - console.log 和 debugger 都允许 ✅
- `pre-push` → 推送前检查

**安装位置：** `.git/hooks/`

---

## 📝 Git 提交规范（重要！）

### 提交格式

```
<type>(<scope>): <subject>
```

### 常用类型

| 类型       | 说明     | 示例                       |
| ---------- | -------- | -------------------------- |
| `feat`     | 新功能   | `feat(user): 添加用户登录` |
| `fix`      | Bug修复  | `fix(auth): 修复验证失败`  |
| `docs`     | 文档     | `docs: 更新README`         |
| `refactor` | 重构     | `refactor(api): 优化接口`  |
| `perf`     | 性能优化 | `perf: 优化查询速度`       |
| `style`    | 格式调整 | `style: 格式化代码`        |
| `test`     | 测试     | `test: 添加单元测试`       |
| `chore`    | 其他     | `chore: 更新依赖`          |

### 示例

```bash
✅ git commit -m "feat(editor): 添加代码高亮功能"
✅ git commit -m "fix(tree): 修复树节点渲染bug"
✅ git commit -m "docs: 更新安装说明"

❌ git commit -m "update"
❌ git commit -m "修复bug"
❌ git commit -m "完成功能"
```

---

## 🔧 常用命令

### 开发命令

```bash
# 开发模式（构建所有包）
npm run build:dev

# 生产构建
npm run build

# 代码检查
npm run lint

# 自动修复代码问题
npm run lint:fix

# 格式化代码
npm run format
```

### 单独调试

```bash
# 调试主界面
npm run watch:main

# 调试树形视图
npm run watch:tree-view

# 调试设置界面
npm run watch:settings

# 调试扩展
npm run watch:extension
```

### Git Hooks 管理

```bash
# 查看已安装的 hooks
ls -la .git/hooks/

# 手动重新安装 hooks
npm run hooks:install

# 临时跳过 hooks（不推荐）
git commit --no-verify
git push --no-verify
```

### 依赖管理（Windows）

```bash
# 检查依赖状态
scripts\install-deps.bat check

# 重新安装所有依赖
scripts\install-deps.bat reinstall
```

---

## ⚠️ ESLint 检查说明

### 当前配置

- ✅ 允许最多 **20 个警告**（包括 Prettier 格式化警告）
- ❌ **不允许任何错误**

### 提交时的行为

```bash
# ✅ 可以提交
0 错误 + 0 警告 = 通过 ✅
0 错误 + 10 警告 = 通过 ✅
0 错误 + 20 警告 = 通过 ✅

# ❌ 会被阻止
1 错误 + 0 警告 = 失败 ❌
0 错误 + 21 警告 = 失败 ❌
任何错误 = 失败 ❌
```

### 如何修复 ESLint 错误和格式化问题

```bash
# 1. 查看所有问题
npm run lint

# 2. 自动修复代码质量问题
npm run lint:fix

# 3. 自动修复格式化问题（推荐）⭐
npm run format

# 4. 或者同时修复（推荐）
npm run format && npm run lint:fix

# 5. 手动修复后重新提交
git add .
git commit -m "fix: 修复代码规范问题"
```

### 💡 关于 Prettier 格式化警告

项目集成了 Prettier 代码格式化工具，ESLint 会检查代码格式：

```typescript
// ⚠️ Prettier 警告示例
function example() {
  console.log('hello'); // 警告：缩进不正确，应该是 2 个空格
}

// ✅ 格式化后
function example() {
  console.log('hello'); // 正确的缩进
}
```

**快速修复：** 运行 `npm run format` 自动格式化所有代码

---

## 🐛 常见问题

### Q1: 提交时提示"格式错误"

**原因：** 提交消息不符合规范

**解决：**

```bash
# 修改最后一次提交
git commit --amend -m "feat: 正确的格式"
```

### Q2: ESLint 检查失败

**解决：**

```bash
# 自动修复
npm run lint:fix

# 如果自动修复不了，手动修复后再提交
```

### Q3: 不能推送到 dev/main 分支

**原因：** pre-push hook 阻止直接推送到保护分支

**解决：**

```bash
# 1. 创建功能分支
git checkout -b feature/your-feature

# 2. 推送功能分支
git push origin feature/your-feature

# 3. 在 GitLab 上创建 Merge Request
```

### Q4: Git Hooks 没有生效

**解决：**

```bash
# 重新安装 hooks
npm run hooks:install

# 验证安装
ls -la .git/hooks/
# 应该看到: commit-msg, pre-commit, pre-push
```

---

## 📖 更多文档

- [完整 README](./README.md) - 项目架构和详细说明
- [Git Hooks 详细文档](./.gitlab/README.md) - Git Hooks 完整指南
- [代码规范](./eslint.config.mjs) - ESLint 配置

---

## 🎯 工作流程建议

### 标准开发流程

```bash
# 1. 更新主分支
git checkout dev
git pull origin dev

# 2. 创建功能分支
git checkout -b feature/my-feature

# 3. 开发功能
# ... 编写代码 ...

# 4. 提交代码（会自动检查）
git add .
git commit -m "feat(module): 添加新功能"

# 5. 推送分支（会自动检查）
git push origin feature/my-feature

# 6. 在 GitLab 创建 Merge Request
```

### 提交前检查清单

- [ ] 代码已格式化（`npm run format`）
- [ ] 通过 ESLint 检查（`npm run lint`）
- [ ] 提交消息符合规范
- [ ] 功能已测试
- [ ] 文档已更新（如需要）

---

## 💡 提示

1. **首次安装后**，Git Hooks 已自动配置，无需手动操作
2. **安装 VSCode 扩展后**，保存文件时自动格式化和修复 ⭐
3. **提交代码时**，hooks 会自动检查，发现问题会阻止提交
4. **警告不会阻止提交**（允许最多 20 个），但建议及时修复
5. **临时跳过检查**：使用 `--no-verify`，但不推荐
6. **遇到问题**：先运行 `npm run format && npm run lint:fix` 自动修复

---

## 🎉 开始开发

现在你已经了解了所有必要的信息，可以开始愉快地开发了！

```bash
# 开始开发
npm run build:dev

# 按 F5 在 VSCode 中调试
```

**祝编码愉快！** 🚀

---

**维护者**: 工具组IDE  
**更新时间**: 2025-11-20
