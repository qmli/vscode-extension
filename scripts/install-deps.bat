@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "COMMAND=%1"
if "%COMMAND%"=="" set "COMMAND=check"

echo 🔧 NPM Workspace 依赖管理工具
echo.

if "%COMMAND%"=="check" goto :check
if "%COMMAND%"=="install" goto :install
if "%COMMAND%"=="reinstall" goto :reinstall
if "%COMMAND%"=="help" goto :help
goto :help

:check
echo 检查工作区配置和依赖状态...
echo.

REM 检查 npm 是否安装
npm --version >nul 2>&1
if errorlevel 1 (
    echo ✗ 请先安装 npm
    pause
    exit /b 1
)

REM 检查配置文件
if not exist "package.json" (
    echo ✗ package.json 文件不存在
    pause
    exit /b 1
)

echo ✓ 工作区配置检查通过
echo.
echo 检查子项目依赖状态...

REM 检查各个工作区的依赖
call :checkWorkspace "packages/extension"
call :checkWorkspace "packages/webview/webview-main"
call :checkWorkspace "packages/webview/webview-tree"
call :checkWorkspace "packages/webview/webview-settings"
call :checkWorkspace "packages/webview/webview-core"

echo.
echo 检查完成！
pause
exit /b 0

:install
echo 安装所有依赖...
echo.

REM 检查 npm 是否安装
npm --version >nul 2>&1
if errorlevel 1 (
    echo ✗ 请先安装 npm
    pause
    exit /b 1
)

echo 开始安装依赖...
npm install
if errorlevel 1 (
    echo ✗ 依赖安装失败
    pause
    exit /b 1
)

echo ✓ 依赖安装完成
echo.
echo 检查子项目依赖状态...
call :checkWorkspace "packages/extension"
call :checkWorkspace "packages/webview/webview-main"
call :checkWorkspace "packages/webview/webview-tree"
call :checkWorkspace "packages/webview/webview-settings"
call :checkWorkspace "packages/webview/webview-core"

echo.
echo 安装完成！
pause
exit /b 0

:reinstall
echo 强制重新安装所有依赖...
echo.

REM 检查 npm 是否安装
npm --version >nul 2>&1
if errorlevel 1 (
    echo ✗ 请先安装 npm
    pause
    exit /b 1
)

echo 删除所有 node_modules 目录...
for /d /r . %%d in (node_modules) do @if exist "%%d" rmdir /s /q "%%d" 2>nul
if exist "node_modules" rmdir /s /q "node_modules"

echo 删除 lock 文件...
if exist "package-lock.json" del "package-lock.json"

echo ✓ 清理完成
echo.
echo 重新安装依赖...
npm install
if errorlevel 1 (
    echo ✗ 重新安装失败
    pause
    exit /b 1
)

echo ✓ 重新安装完成
pause
exit /b 0

:help
echo 可用命令:
echo   install-deps.bat [command]
echo.
echo 命令:
echo   check     - 检查工作区配置和依赖状态
echo   install   - 安装所有依赖
echo   reinstall - 强制重新安装所有依赖
echo   help      - 显示此帮助信息
echo.
echo 示例:
echo   install-deps.bat check
echo   install-deps.bat install
echo   install-deps.bat reinstall
echo.
pause
exit /b 0

:checkWorkspace
set "WORKSPACE=%~1"
if not exist "%WORKSPACE%" (
    echo ⚠ 工作区目录不存在: %WORKSPACE%
    goto :eof
)

if not exist "%WORKSPACE%\package.json" (
    echo ⚠ package.json 不存在: %WORKSPACE%
    goto :eof
)

if exist "%WORKSPACE%\node_modules" (
    echo ✓ %WORKSPACE% - node_modules 已存在
) else (
    echo ⚠ %WORKSPACE% - node_modules 不存在
)
goto :eof
