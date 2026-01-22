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
git checkout leeoohoo/open_gemini_cli

# 3. 合并官方更新，但排除登录相关文件
echo "🔀 合并官方更新（排除登录文件）..."

# 创建临时分支用于合并
git checkout -b temp-merge-branch

# 合并主分支，但使用我们的策略
git merge main --no-commit --no-ff

# 恢复登录相关文件的删除状态（如果它们被重新引入）
echo "🗑️  确保登录文件保持删除状态..."

# 登录/认证相关路径列表（根据你的删除记录）
LOGIN_PATHS=(
  "packages/cli/src/config/auth.test.ts"
  "packages/cli/src/config/auth.ts"
  "packages/cli/src/core/auth.test.ts"
  "packages/cli/src/core/auth.ts"
  "packages/cli/src/ui/auth"
  "packages/cli/src/ui/commands/authCommand.test.ts"
  "packages/cli/src/ui/commands/authCommand.ts"
  "packages/cli/src/validateNonInterActiveAuth.test.ts"
  "packages/cli/src/validateNonInterActiveAuth.ts"
  "packages/core/src/code_assist/oauth-credential-storage.test.ts"
  "packages/core/src/code_assist/oauth-credential-storage.ts"
  "packages/core/src/code_assist/oauth2.test.ts"
  "packages/core/src/code_assist/oauth2.ts"
  "packages/core/src/mcp/auth-provider.ts"
  "packages/core/src/mcp/google-auth-provider.test.ts"
  "packages/core/src/mcp/google-auth-provider.ts"
  "packages/core/src/mcp/oauth-provider.test.ts"
  "packages/core/src/mcp/oauth-provider.ts"
  "packages/core/src/mcp/oauth-token-storage.test.ts"
  "packages/core/src/mcp/oauth-token-storage.ts"
  "packages/core/src/mcp/oauth-utils.test.ts"
  "packages/core/src/mcp/oauth-utils.ts"
  "packages/core/src/mcp/sa-impersonation-provider.test.ts"
  "packages/core/src/mcp/sa-impersonation-provider.ts"
  "packages/core/src/mcp/token-storage"
  "docs/get-started/authentication.md"
  "docs/cli/authentication.md"
)

# 检查并删除任何重新引入的登录文件
for path in "${LOGIN_PATHS[@]}"; do
  if [ -e "$path" ]; then
    echo "  ❌ 删除重新引入的登录/认证路径: $path"
    if [ -d "$path" ]; then
      git rm -r "$path"
    else
      git rm "$path"
    fi
  fi
done

# 4. 运行多模型配置保护
echo "🔒 运行多模型配置保护..."
bash ./scripts/protect-multi-model-config.sh

# 5. 运行同步验证
echo "✅ 运行同步验证..."
bash ./scripts/validate-sync.sh

# 6. 提交合并
echo "💾 提交合并..."
git commit -m "chore: merge upstream changes (main -> leeoohoo/open_gemini_cli)

- Merge latest changes from official repository
- Maintain no-login modifications
- Exclude re-introduced authentication files"

# 7. 清理临时分支
echo "🧹 清理临时分支..."
git checkout leeoohoo/open_gemini_cli
git merge temp-merge-branch --ff-only
git branch -d temp-merge-branch

# 8. 推送到你的仓库
echo "🚀 推送到个人仓库..."
git push myrepo leeoohoo/open_gemini_cli

echo "✅ 同步完成！"
echo ""
echo "📋 下一步建议："
echo "1. 运行测试确保功能正常: npm run preflight"
echo "2. 检查是否有新的登录相关代码需要处理"
echo "3. 更新文档（如果需要）"
