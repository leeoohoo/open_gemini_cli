# 同步无登录版本的 Gemini CLI 脚本 (PowerShell)
# 使用方法: .\sync-no-login.ps1

Write-Host "🔧 开始同步无登录版本的 Gemini CLI..." -ForegroundColor Cyan

function Invoke-BashScript {
  param([string]$ScriptPath)

  if (-not (Test-Path $ScriptPath)) {
    Write-Error "Script not found: $ScriptPath"
    exit 1
  }

  if (-not (Get-Command bash -ErrorAction SilentlyContinue)) {
    Write-Error "bash was not found. Install Git Bash or WSL to run shell scripts."
    exit 1
  }

  & bash $ScriptPath
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

# 1. 切换到主分支并拉取最新代码
Write-Host "📥 拉取官方最新代码..." -ForegroundColor Yellow
git checkout main
git pull origin main

# 2. 切换到无登录分支
Write-Host "🔄 切换到无登录分支..." -ForegroundColor Yellow
git checkout leeoohoo/open_gemini_cli

# 3. 合并官方更新，但排除登录相关文件
Write-Host "🔀 合并官方更新（排除登录文件）..." -ForegroundColor Yellow

# 创建临时分支用于合并
git checkout -b temp-merge-branch

# 合并主分支，但使用我们的策略
git merge main --no-commit --no-ff

# 登录/认证相关路径列表（根据你的删除记录）
$loginPaths = @(
  "packages/cli/src/config/auth.test.ts",
  "packages/cli/src/config/auth.ts",
  "packages/cli/src/core/auth.test.ts",
  "packages/cli/src/core/auth.ts",
  "packages/cli/src/ui/auth",
  "packages/cli/src/ui/commands/authCommand.test.ts",
  "packages/cli/src/ui/commands/authCommand.ts",
  "packages/cli/src/validateNonInterActiveAuth.test.ts",
  "packages/cli/src/validateNonInterActiveAuth.ts",
  "packages/core/src/code_assist/oauth-credential-storage.test.ts",
  "packages/core/src/code_assist/oauth-credential-storage.ts",
  "packages/core/src/code_assist/oauth2.test.ts",
  "packages/core/src/code_assist/oauth2.ts",
  "packages/core/src/mcp/auth-provider.ts",
  "packages/core/src/mcp/google-auth-provider.test.ts",
  "packages/core/src/mcp/google-auth-provider.ts",
  "packages/core/src/mcp/oauth-provider.test.ts",
  "packages/core/src/mcp/oauth-provider.ts",
  "packages/core/src/mcp/oauth-token-storage.test.ts",
  "packages/core/src/mcp/oauth-token-storage.ts",
  "packages/core/src/mcp/oauth-utils.test.ts",
  "packages/core/src/mcp/oauth-utils.ts",
  "packages/core/src/mcp/sa-impersonation-provider.test.ts",
  "packages/core/src/mcp/sa-impersonation-provider.ts",
  "packages/core/src/mcp/token-storage",
  "docs/get-started/authentication.md",
  "docs/cli/authentication.md"
)

Write-Host "🗑️  确保登录文件保持删除状态..." -ForegroundColor Yellow

# 检查并删除任何重新引入的登录文件
foreach ($path in $loginPaths) {
  if (Test-Path $path) {
    Write-Host "  ❌ 删除重新引入的登录/认证路径: $path" -ForegroundColor Red
    if (Test-Path $path -PathType Container) {
      git rm -r $path
    } else {
      git rm $path
    }
  }
}

# 4. 运行多模型配置保护
Write-Host "🔒 运行多模型配置保护..." -ForegroundColor Yellow
Invoke-BashScript "./scripts/protect-multi-model-config.sh"

# 5. 运行同步验证
Write-Host "✅ 运行同步验证..." -ForegroundColor Yellow
Invoke-BashScript "./scripts/validate-sync.sh"

# 6. 提交合并
Write-Host "💾 提交合并..." -ForegroundColor Yellow
git commit -m "chore: merge upstream changes (main -> leeoohoo/open_gemini_cli)

- Merge latest changes from official repository
- Maintain no-login modifications
- Exclude re-introduced authentication files"

# 7. 清理临时分支
Write-Host "🧹 清理临时分支..." -ForegroundColor Yellow
git checkout leeoohoo/open_gemini_cli
git merge temp-merge-branch --ff-only
git branch -d temp-merge-branch

# 8. 推送到你的仓库
Write-Host "🚀 推送到个人仓库..." -ForegroundColor Green
git push myrepo leeoohoo/open_gemini_cli

Write-Host "✅ 同步完成！" -ForegroundColor Green
Write-Host ""
Write-Host "📋 下一步建议：" -ForegroundColor Cyan
Write-Host "1. 运行测试确保功能正常: npm run preflight"
Write-Host "2. 检查是否有新的登录相关代码需要处理"
Write-Host "3. 更新文档（如果需要）"
