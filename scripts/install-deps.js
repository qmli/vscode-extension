#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 工作区配置
const workspaces = ['extension', 'packages/dbdriver'];

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step) {
  log(`\n${colors.cyan}${step}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'blue');
}

// 检查 npm 是否安装
function checkNpm() {
  try {
    execSync('npm --version', { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

// 检查工作区配置
function checkWorkspaceConfig() {
  // 检查 package.json 中的 workspaces 配置是否存在
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    logError('package.json 文件不存在');
    return false;
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (!packageJson.workspaces || packageJson.workspaces.length === 0) {
      logError('package.json 中缺少 workspaces 配置');
      return false;
    }
    return true;
  } catch (error) {
    logError('无法解析 package.json 文件');
    return false;
  }
}

// 安装根目录依赖
function installRootDeps() {
  logStep('安装根目录依赖...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    logSuccess('根目录依赖安装完成');
    return true;
  } catch (error) {
    logError('根目录依赖安装失败');
    return false;
  }
}

// 检查子项目依赖
function checkSubProjectDeps() {
  logStep('检查子项目依赖...');

  for (const workspace of workspaces) {
    const workspacePath = path.join(process.cwd(), workspace);
    const packageJsonPath = path.join(workspacePath, 'package.json');
    const nodeModulesPath = path.join(workspacePath, 'node_modules');

    if (!fs.existsSync(workspacePath)) {
      logWarning(`工作区目录不存在: ${workspace}`);
      continue;
    }

    if (!fs.existsSync(packageJsonPath)) {
      logWarning(`package.json 不存在: ${workspace}`);
      continue;
    }

    if (fs.existsSync(nodeModulesPath)) {
      logSuccess(`${workspace} - node_modules 已存在`);
    } else {
      logWarning(`${workspace} - node_modules 不存在`);
    }
  }
}

// 强制重新安装所有依赖
function forceReinstall() {
  logStep('强制重新安装所有依赖...');

  try {
    // 删除所有 node_modules
    logInfo('删除所有 node_modules 目录...');
    execSync('npm run clean:modules', { stdio: 'inherit' });

    // 删除根目录 node_modules
    const rootNodeModules = path.join(process.cwd(), 'node_modules');
    if (fs.existsSync(rootNodeModules)) {
      fs.rmSync(rootNodeModules, { recursive: true, force: true });
    }

    // 删除 lock 文件
    const lockFile = path.join(process.cwd(), 'package-lock.json');
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }

    logSuccess('清理完成');

    // 重新安装
    logInfo('重新安装依赖...');
    execSync('npm install', { stdio: 'inherit' });
    logSuccess('重新安装完成');
  } catch (error) {
    logError('强制重新安装失败');
    console.error(error);
  }
}

// 显示帮助信息
function showHelp() {
  log('\n可用命令:', 'bright');
  log('  install-deps.js [command]', 'cyan');
  log('\n命令:', 'bright');
  log('  check     - 检查工作区配置和依赖状态');
  log('  install   - 安装所有依赖');
  log('  reinstall - 强制重新安装所有依赖');
  log('  help      - 显示此帮助信息');
  log('\n示例:', 'bright');
  log('  node scripts/install-deps.js check');
  log('  node scripts/install-deps.js install');
  log('  node scripts/install-deps.js reinstall');
}

// 主函数
function main() {
  const command = process.argv[2] || 'check';

  log('🔧 NPM Workspace 依赖管理工具', 'bright');

  switch (command) {
    case 'check':
      if (!checkNpm()) {
        logError('npm 未安装或版本不兼容');
        process.exit(1);
      }

      if (!checkWorkspaceConfig()) {
        logError('工作区配置有问题，请检查配置文件');
        process.exit(1);
      }

      logSuccess('工作区配置检查通过');
      checkSubProjectDeps();
      break;

    case 'install':
      if (!checkNpm()) {
        logError('npm 未安装或版本不兼容');
        process.exit(1);
      }

      if (!checkWorkspaceConfig()) {
        logError('工作区配置有问题，请检查配置文件');
        process.exit(1);
      }

      installRootDeps();
      checkSubProjectDeps();
      break;

    case 'reinstall':
      if (!checkNpm()) {
        logError('npm 未安装或版本不兼容');
        process.exit(1);
      }

      forceReinstall();
      break;

    case 'help':
    default:
      showHelp();
      break;
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  checkNpm,
  checkWorkspaceConfig,
  installRootDeps,
  checkSubProjectDeps,
  forceReinstall
};
