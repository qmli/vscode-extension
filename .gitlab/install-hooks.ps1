# ========================================
# Git Hooks 安装脚本 (PowerShell 版本)
# ========================================
# 
# 功能：将 .gitlab/hooks 中的 hooks 安装到 .git/hooks
# 用途：Windows 用户快速启用本地 Git hooks
# 使用：.\\.gitlab\install-hooks.ps1
# ========================================

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "   Git Hooks 安装工具" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# 检查是否在 Git 仓库中
if (-not (Test-Path ".git")) {
    Write-Host "✗ 错误: 当前目录不是 Git 仓库" -ForegroundColor Red
    Write-Host "   请在项目根目录运行此脚本"
    exit 1
}

# 检查 .gitlab/hooks 目录是否存在
if (-not (Test-Path ".gitlab\hooks")) {
    Write-Host "✗ 错误: .gitlab\hooks 目录不存在" -ForegroundColor Red
    exit 1
}

# 确保 .git/hooks 目录存在
if (-not (Test-Path ".git\hooks")) {
    New-Item -ItemType Directory -Path ".git\hooks" | Out-Null
}

# 获取所有可用的 hooks
$hooks = Get-ChildItem ".gitlab\hooks" -File | Where-Object { 
    $_.Extension -ne ".md" -and $_.Extension -ne ".txt" -and $_.Extension -ne ".ps1"
} | Select-Object -ExpandProperty Name

if ($hooks.Count -eq 0) {
    Write-Host "✗ 错误: 没有找到可安装的 hooks" -ForegroundColor Red
    exit 1
}

Write-Host "📋 找到以下 hooks:" -ForegroundColor Blue
foreach ($hook in $hooks) {
    Write-Host "   - $hook" -ForegroundColor Green
}
Write-Host ""

# 询问用户确认
$response = Read-Host "是否安装这些 hooks？[Y/n]"
if ([string]::IsNullOrWhiteSpace($response)) {
    $response = "Y"
}

if ($response -ne "Y" -and $response -ne "y") {
    Write-Host "已取消安装" -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "开始安装 hooks..." -ForegroundColor Blue
Write-Host ""

$installed = 0
$skipped = 0
$backedUp = 0

# 安装每个 hook
foreach ($hook in $hooks) {
    $source = ".gitlab\hooks\$hook"
    $target = ".git\hooks\$hook"
    
    # 如果目标文件已存在，创建备份
    if (Test-Path $target) {
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $backup = "$target.backup.$timestamp"
        Copy-Item $target $backup
        Write-Host "⚠  备份现有 hook: $hook → $(Split-Path $backup -Leaf)" -ForegroundColor Yellow
        $backedUp++
    }
    
    # 复制文件
    try {
        Copy-Item $source $target -Force
        Write-Host "✓ 安装: $hook" -ForegroundColor Green
        $installed++
    }
    catch {
        Write-Host "✗ 安装失败: $hook" -ForegroundColor Red
        Write-Host "   错误: $_" -ForegroundColor Red
        $skipped++
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ 安装完成！" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "统计信息："
Write-Host "   已安装: $installed" -ForegroundColor Green
if ($backedUp -gt 0) {
    Write-Host "   已备份: $backedUp" -ForegroundColor Yellow
}
if ($skipped -gt 0) {
    Write-Host "   失败: $skipped" -ForegroundColor Red
}
Write-Host ""

# 显示已安装的 hooks 说明
Write-Host "📖 Hooks 说明：" -ForegroundColor Blue
Write-Host ""
if (Test-Path ".git\hooks\commit-msg") {
    Write-Host "   commit-msg" -ForegroundColor Green
    Write-Host "   └─ 在提交时检查提交消息格式"
    Write-Host "   └─ 确保符合约定式提交规范"
    Write-Host ""
}
if (Test-Path ".git\hooks\pre-commit") {
    Write-Host "   pre-commit" -ForegroundColor Green
    Write-Host "   └─ 在提交前检查代码质量"
    Write-Host "   └─ 检测冲突标记、调试代码、敏感信息等"
    Write-Host ""
}
if (Test-Path ".git\hooks\pre-push") {
    Write-Host "   pre-push" -ForegroundColor Green
    Write-Host "   └─ 在推送前进行最后检查"
    Write-Host "   └─ 防止推送到保护分支、检查提交格式等"
    Write-Host ""
}

Write-Host "💡 使用提示：" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1. Hooks 会在对应的 Git 操作时自动运行"
Write-Host "   2. 如需临时跳过 hook，可使用:"
Write-Host "      git commit --no-verify  (跳过 commit-msg 和 pre-commit)" -ForegroundColor Blue
Write-Host "      git push --no-verify    (跳过 pre-push)" -ForegroundColor Blue
Write-Host ""
Write-Host "   3. 如需卸载 hooks:"
Write-Host "      Remove-Item .git\hooks\commit-msg" -ForegroundColor Blue
Write-Host "      Remove-Item .git\hooks\pre-commit" -ForegroundColor Blue
Write-Host "      Remove-Item .git\hooks\pre-push" -ForegroundColor Blue
Write-Host ""
Write-Host "   4. 如需重新安装，再次运行此脚本即可"
Write-Host ""

Write-Host "🎉 现在你的 Git 提交将受到本地检查保护！" -ForegroundColor Green
Write-Host ""

Write-Host "注意事项：" -ForegroundColor Yellow
Write-Host "   - 确保已安装 Git for Windows（包含 Git Bash）" -ForegroundColor Gray
Write-Host "   - Hooks 会使用 Git Bash 的 sh.exe 执行" -ForegroundColor Gray
Write-Host "   - 如遇到问题，请确保 Git 已正确添加到 PATH" -ForegroundColor Gray
Write-Host ""

