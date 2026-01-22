#!/bin/bash
# 同步无登录版本的 Gemini CLI 脚本
# 使用方法: ./sync-no-login.sh

set -e  # 出错时退出

echo "🔧 开始同步无登录版本的 Gemini CLI..."

# 1. 切换到主分支并拉取最新代码
echo "📥 拉取官方最新代码..."
git checkout main
git pull origin main

# 2. 切换到无登录分支
echo "🔄 切换到无登录分支..."
git checkout leeoohoo/gemini_cli_no_login

# 3. 合并官方更新，但排除登录相关文件
echo "🔀 合并官方更新（排除登录文件）..."

# 创建临时分支用于合并
git checkout -b temp-merge-branch

# 合并主分支，但使用我们的策略
git merge main --no-commit --no-ff

# 恢复登录相关文件的删除状态（如果它们被重新引入）
echo "🗑️  确保登录文件保持删除状态..."

# 登录相关文件列表（根据你的删除记录）
LOGIN_FILES=(
  "packages/cli/src/config/auth.test.ts"
  "packages/cli/src/config/auth.ts"
  "packages/cli/src/core/auth.test.ts"
  "packages/cli/src/core/auth.ts"
  "packages/cli/src/ui/auth/ApiAuthDialog.test.tsx"
  "packages/cli/src/ui/auth/ApiAuthDialog.tsx"
  "packages/cli/src/ui/auth/AuthDialog.test.tsx"
  "packages/cli/src/ui/auth/AuthDialog.tsx"
  "packages/cli/src/ui/auth/AuthInProgress.test.tsx"
  "packages/cli/src/ui/auth/AuthInProgress.tsx"
  "packages/cli/src/ui/auth/LoginWithGoogleRestartDialog.test.tsx"
  "packages/cli/src/ui/auth/LoginWithGoogleRestartDialog.tsx"
  "packages/cli/src/ui/auth/__snapshots__/ApiAuthDialog.test.tsx.snap"
  "packages/cli/src/ui/auth/__snapshots__/AuthDialog.test.tsx.snap"
  "packages/cli/src/ui/auth/__snapshots__/LoginWithGoogleRestartDialog.test.tsx.snap"
  "packages/cli/src/ui/auth/useAuth.test.tsx"
  "packages/cli/src/ui/auth/useAuth.ts"
  "packages/cli/src/ui/commands/authCommand.test.ts"
  "packages/cli/src/ui/commands/authCommand.ts"
  "packages/cli/src/validateNonInterActiveAuth.test.ts"
)

# 检查并删除任何重新引入的登录文件
for file in "${LOGIN_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ❌ 删除重新引入的登录文件: $file"
    git rm "$file"
  fi
done

# 4. 提交合并
echo "💾 提交合并..."
git commit -m "chore: merge upstream changes (main -> leeoohoo/gemini_cli_no_login)

- Merge latest changes from official repository
- Maintain no-login modifications
- Exclude re-introduced authentication files"

# 5. 清理临时分支
echo "🧹 清理临时分支..."
git checkout leeoohoo/gemini_cli_no_login
git merge temp-merge-branch --ff-only
git branch -d temp-merge-branch

# 6. 推送到你的仓库
echo "🚀 推送到个人仓库..."
git push myrepo leeoohoo/gemini_cli_no_login

echo "✅ 同步完成！"
echo ""
echo "📋 下一步建议："
echo "1. 运行测试确保功能正常: npm run preflight"
echo "2. 检查是否有新的登录相关代码需要处理"
echo "3. 更新文档（如果需要）"