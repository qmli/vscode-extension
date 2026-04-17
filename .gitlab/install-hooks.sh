#!/bin/bash
# ========================================
# Git Hooks 安装脚本
# ========================================
# 
# 功能：将 .gitlab/hooks 中的 hooks 安装到 .git/hooks
# 用途：让团队成员能够快速启用本地 Git hooks
# ========================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "${CYAN}================================${NC}"
echo "${CYAN}   Git Hooks 安装工具${NC}"
echo "${CYAN}================================${NC}"
echo ""

# 检查是否在 Git 仓库中
if [ ! -d ".git" ]; then
    echo "${RED}✗ 错误: 当前目录不是 Git 仓库${NC}"
    echo "   请在项目根目录运行此脚本"
    exit 1
fi

# 检查 .gitlab/hooks 目录是否存在
if [ ! -d ".gitlab/hooks" ]; then
    echo "${RED}✗ 错误: .gitlab/hooks 目录不存在${NC}"
    exit 1
fi

# 确保 .git/hooks 目录存在
mkdir -p .git/hooks

# 获取所有可用的 hooks
HOOKS=$(ls .gitlab/hooks/ 2>/dev/null | grep -v '\.md$' | grep -v '\.txt$')

if [ -z "$HOOKS" ]; then
    echo "${RED}✗ 错误: 没有找到可安装的 hooks${NC}"
    exit 1
fi

echo "${BLUE}📋 找到以下 hooks:${NC}"
for hook in $HOOKS; do
    echo "   - ${GREEN}$hook${NC}"
done
echo ""

# 询问用户确认
echo "${YELLOW}是否安装这些 hooks？[Y/n]${NC} "
read -r response
response=${response:-Y}

if [ "$response" != "Y" ] && [ "$response" != "y" ]; then
    echo "${YELLOW}已取消安装${NC}"
    exit 0
fi

echo ""
echo "${BLUE}开始安装 hooks...${NC}"
echo ""

INSTALLED=0
SKIPPED=0
BACKED_UP=0

# 安装每个 hook
for hook in $HOOKS; do
    SOURCE=".gitlab/hooks/$hook"
    TARGET=".git/hooks/$hook"
    
    # 如果目标文件已存在，创建备份
    if [ -f "$TARGET" ]; then
        BACKUP="${TARGET}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$TARGET" "$BACKUP"
        echo "${YELLOW}⚠  备份现有 hook: $hook → $(basename $BACKUP)${NC}"
        BACKED_UP=$((BACKED_UP + 1))
    fi
    
    # 复制并设置可执行权限
    if cp "$SOURCE" "$TARGET"; then
        chmod +x "$TARGET"
        echo "${GREEN}✓ 安装: $hook${NC}"
        INSTALLED=$((INSTALLED + 1))
    else
        echo "${RED}✗ 安装失败: $hook${NC}"
        SKIPPED=$((SKIPPED + 1))
    fi
done

echo ""
echo "${CYAN}================================${NC}"
echo "${GREEN}✅ 安装完成！${NC}"
echo "${CYAN}================================${NC}"
echo ""
echo "统计信息："
echo "   ${GREEN}已安装: $INSTALLED${NC}"
if [ $BACKED_UP -gt 0 ]; then
    echo "   ${YELLOW}已备份: $BACKED_UP${NC}"
fi
if [ $SKIPPED -gt 0 ]; then
    echo "   ${RED}失败: $SKIPPED${NC}"
fi
echo ""

# 显示已安装的 hooks 说明
echo "${BLUE}📖 Hooks 说明：${NC}"
echo ""
if [ -f ".git/hooks/commit-msg" ]; then
    echo "   ${GREEN}commit-msg${NC}"
    echo "   └─ 在提交时检查提交消息格式"
    echo "   └─ 确保符合约定式提交规范"
    echo ""
fi
if [ -f ".git/hooks/pre-commit" ]; then
    echo "   ${GREEN}pre-commit${NC}"
    echo "   └─ 在提交前检查代码质量"
    echo "   └─ 检测冲突标记、调试代码、敏感信息等"
    echo ""
fi
if [ -f ".git/hooks/pre-push" ]; then
    echo "   ${GREEN}pre-push${NC}"
    echo "   └─ 在推送前进行最后检查"
    echo "   └─ 防止推送到保护分支、检查提交格式等"
    echo ""
fi

echo "${YELLOW}💡 使用提示：${NC}"
echo ""
echo "   1. Hooks 会在对应的 Git 操作时自动运行"
echo "   2. 如需临时跳过 hook，可使用:"
echo "      ${BLUE}git commit --no-verify${NC}  (跳过 commit-msg 和 pre-commit)"
echo "      ${BLUE}git push --no-verify${NC}    (跳过 pre-push)"
echo ""
echo "   3. 如需卸载 hooks:"
echo "      ${BLUE}rm .git/hooks/commit-msg${NC}"
echo "      ${BLUE}rm .git/hooks/pre-commit${NC}"
echo "      ${BLUE}rm .git/hooks/pre-push${NC}"
echo ""
echo "   4. 如需重新安装，再次运行此脚本即可"
echo ""

echo "${GREEN}🎉 现在你的 Git 提交将受到本地检查保护！${NC}"
echo ""

