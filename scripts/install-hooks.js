#!/usr/bin/env node
/**
 * Git Hooks 自动安装脚本
 * 在 npm install 后自动执行
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.cyan}${colors.bright}${msg}${colors.reset}\n`),
};

function installHooks() {
  log.title('📦 安装 Git Hooks...');

  // 检查是否在 Git 仓库中
  const gitDir = path.join(process.cwd(), '.git');
  if (!fs.existsSync(gitDir)) {
    log.warning('不在 Git 仓库中，跳过 hooks 安装');
    return;
  }

  // 源目录和目标目录
  const sourceDir = path.join(process.cwd(), '.gitlab', 'hooks');
  const targetDir = path.join(process.cwd(), '.git', 'hooks');

  // 检查源目录
  if (!fs.existsSync(sourceDir)) {
    log.error('.gitlab/hooks 目录不存在');
    return;
  }

  // 确保目标目录存在
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 获取所有 hook 文件
  const hooks = fs
    .readdirSync(sourceDir)
    .filter((file) => {
      const ext = path.extname(file);
      return !['.md', '.txt', '.ps1', '.sh'].includes(ext);
    });

  if (hooks.length === 0) {
    log.warning('没有找到可安装的 hooks');
    return;
  }

  let installed = 0;
  let skipped = 0;

  // 安装每个 hook
  hooks.forEach((hook) => {
    const source = path.join(sourceDir, hook);
    const target = path.join(targetDir, hook);

    try {
      // 复制文件
      fs.copyFileSync(source, target);

      // Windows 下不需要设置可执行权限，Git Bash 会处理
      // Unix 系统下设置可执行权限
      if (process.platform !== 'win32') {
        fs.chmodSync(target, 0o755);
      }

      log.success(`安装 ${hook}`);
      installed++;
    } catch (error) {
      log.error(`安装 ${hook} 失败: ${error.message}`);
      skipped++;
    }
  });

  console.log('');
  log.title('✅ Git Hooks 安装完成！');
  console.log(`   ${colors.green}已安装: ${installed}${colors.reset}`);
  if (skipped > 0) {
    console.log(`   ${colors.red}失败: ${skipped}${colors.reset}`);
  }

  console.log('');
  log.info('已安装的 hooks:');
  console.log(`   • ${colors.green}commit-msg${colors.reset}  - 检查提交消息格式`);
  console.log(`   • ${colors.green}pre-commit${colors.reset}  - 提交前检查（ESLint + type-check + build）`);
  console.log(`   • ${colors.green}pre-push${colors.reset}    - 推送前检查`);
  console.log('');
  log.info(`如需跳过检查: ${colors.blue}git commit --no-verify${colors.reset}`);
  console.log('');
}

// 执行安装
try {
  installHooks();
} catch (error) {
  log.error(`安装失败: ${error.message}`);
  process.exit(1);
}

