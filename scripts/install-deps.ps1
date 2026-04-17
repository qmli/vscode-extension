# NPM Workspace 依赖管理工具 (PowerShell 版本)

param(
    [Parameter(Position=0)]
    [ValidateSet("check", "install", "reinstall", "help")]
    [string]$Command = "check"
)

# 工作区配置
$Workspaces = @(
    "packages/extension",
    "packages/webview/webview-main",
    "packages/webview/webview-tree",
    "packages/webview/webview-settings",
    "packages/webview/webview-core"
)

# 颜色输出函数
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Step {
    param([string]$Step)
    Write-ColorOutput "`n$Step" "Cyan"
}

function Write-Success {
    param([string]$Message)
    Write-ColorOutput "✓ $Message" "Green"
}

function Write-Error {
    param([string]$Message)
    Write-ColorOutput "✗ $Message" "Red"
}

function Write-Warning {
    param([string]$Message)
    Write-ColorOutput "⚠ $Message" "Yellow"
}

function Write-Info {
    param([string]$Message)
    Write-ColorOutput "ℹ $Message" "Blue"
}

# 检查 npm 是否安装
function Test-NpmInstalled {
    try {
        $null = Get-Command npm -ErrorAction Stop
        return $true
    }
    catch {
        return $false
    }
}

# 检查工作区配置
function Test-WorkspaceConfig {
    $packageJson = Join-Path $PWD "package.json"

    if (-not (Test-Path $packageJson)) {
        Write-Error "package.json 文件不存在"
        return $false
    }

    try {
        $pkg = Get-Content $packageJson | ConvertFrom-Json
        if (-not $pkg.workspaces -or $pkg.workspaces.Count -eq 0) {
            Write-Error "package.json 中缺少 workspaces 配置"
            return $false
        }
        return $true
    }
    catch {
        Write-Error "无法解析 package.json 文件"
        return $false
    }
}

# 安装根目录依赖
function Install-RootDeps {
    Write-Step "安装根目录依赖..."
    try {
        npm install
        Write-Success "根目录依赖安装完成"
        return $true
    }
    catch {
        Write-Error "根目录依赖安装失败"
        return $false
    }
}

# 检查子项目依赖
function Test-SubProjectDeps {
    Write-Step "检查子项目依赖..."

    foreach ($workspace in $Workspaces) {
        $workspacePath = Join-Path $PWD $workspace
        $packageJsonPath = Join-Path $workspacePath "package.json"
        $nodeModulesPath = Join-Path $workspacePath "node_modules"

        if (-not (Test-Path $workspacePath)) {
            Write-Warning "工作区目录不存在: $workspace"
            continue
        }

        if (-not (Test-Path $packageJsonPath)) {
            Write-Warning "package.json 不存在: $workspace"
            continue
        }

        if (Test-Path $nodeModulesPath) {
            Write-Success "$workspace - node_modules 已存在"
        } else {
            Write-Warning "$workspace - node_modules 不存在"
        }
    }
}

# 强制重新安装所有依赖
function Force-Reinstall {
    Write-Step "强制重新安装所有依赖..."

    try {
        # 删除所有 node_modules
        Write-Info "删除所有 node_modules 目录..."
        Get-ChildItem -Path $PWD -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

        # 删除根目录 node_modules
        $rootNodeModules = Join-Path $PWD "node_modules"
        if (Test-Path $rootNodeModules) {
            Remove-Item -Recurse -Force $rootNodeModules
        }

        # 删除 lock 文件
        $lockFile = Join-Path $PWD "package-lock.json"
        if (Test-Path $lockFile) {
            Remove-Item $lockFile
        }

        Write-Success "清理完成"

        # 重新安装
        Write-Info "重新安装依赖..."
        npm install
        Write-Success "重新安装完成"

    }
    catch {
        Write-Error "强制重新安装失败"
        Write-Error $_.Exception.Message
    }
}

# 显示帮助信息
function Show-Help {
    Write-ColorOutput "`n可用命令:" "White"
    Write-ColorOutput "  .\install-deps.ps1 [command]" "Cyan"
    Write-ColorOutput "`n命令:" "White"
    Write-ColorOutput "  check     - 检查工作区配置和依赖状态" "White"
    Write-ColorOutput "  install   - 安装所有依赖" "White"
    Write-ColorOutput "  reinstall - 强制重新安装所有依赖" "White"
    Write-ColorOutput "  help      - 显示此帮助信息" "White"
    Write-ColorOutput "`n示例:" "White"
    Write-ColorOutput "  .\install-deps.ps1 check" "White"
    Write-ColorOutput "  .\install-deps.ps1 install" "White"
    Write-ColorOutput "  .\install-deps.ps1 reinstall" "White"
}

# 主函数
function Main {
    Write-ColorOutput "🔧 NPM Workspace 依赖管理工具" "White"

    switch ($Command) {
        "check" {
            if (-not (Test-NpmInstalled)) {
                Write-Error "请先安装 npm"
                exit 1
            }

            if (-not (Test-WorkspaceConfig)) {
                Write-Error "工作区配置有问题，请检查配置文件"
                exit 1
            }

            Write-Success "工作区配置检查通过"
            Test-SubProjectDeps
        }

        "install" {
            if (-not (Test-NpmInstalled)) {
                Write-Error "请先安装 npm"
                exit 1
            }

            if (-not (Test-WorkspaceConfig)) {
                Write-Error "工作区配置有问题，请检查配置文件"
                exit 1
            }

            Install-RootDeps
            Test-SubProjectDeps
        }

        "reinstall" {
            if (-not (Test-NpmInstalled)) {
                Write-Error "请先安装 npm"
                exit 1
            }

            Force-Reinstall
        }

        "help" {
            Show-Help
        }

        default {
            Show-Help
        }
    }
}

# 运行主函数
Main
