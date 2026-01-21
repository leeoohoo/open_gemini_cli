# 检查登录相关文件的脚本
# 使用方法: .\check-login-files.ps1

Write-Host "🔍 检查登录相关文件..." -ForegroundColor Cyan

# 登录相关关键词
$loginKeywords = @(
  "auth",
  "login",
  "oauth",
  "google.*sign",
  "authentication",
  "credential",
  "token",
  "api.*key",
  "apikey"
)

# 登录相关文件路径模式
$loginFilePatterns = @(
  "*auth*",
  "*login*",
  "*oauth*",
  "*credential*",
  "*token*"
)

Write-Host "📁 检查文件系统中的登录相关文件..." -ForegroundColor Yellow
$foundFiles = @()

# 搜索文件
Get-ChildItem -Recurse -File -Include *.ts,*.tsx,*.js,*.jsx,*.json | Where-Object {
  foreach ($pattern in $loginFilePatterns) {
    if ($_.Name -like $pattern) {
      $foundFiles += $_
      return $true
    }
  }
  return $false
} | ForEach-Object {
  Write-Host "  ⚠️  发现可能相关的文件: $($_.FullName)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔤 检查代码中的登录相关关键词..." -ForegroundColor Yellow

# 搜索代码内容
foreach ($keyword in $loginKeywords) {
  $results = Select-String -Path "*.ts","*.tsx","*.js","*.jsx" -Pattern $keyword -Recurse
  if ($results) {
    Write-Host "  🔎 关键词 '$keyword' 在以下文件中找到:" -ForegroundColor Magenta
    $results | Select-Object -Unique Path | ForEach-Object {
      Write-Host "    - $($_.Path)" -ForegroundColor Gray
    }
  }
}

Write-Host ""
Write-Host "📊 检查结果摘要:" -ForegroundColor Cyan
if ($foundFiles.Count -eq 0) {
  Write-Host "  ✅ 未发现明显的登录相关文件" -ForegroundColor Green
} else {
  Write-Host "  ⚠️  发现 $($foundFiles.Count) 个可能相关的文件" -ForegroundColor Yellow
  Write-Host "  建议检查这些文件是否需要处理" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 建议操作:" -ForegroundColor Cyan
Write-Host "1. 如果有登录文件被重新引入，运行: .\sync-no-login.ps1"
Write-Host "2. 或者手动删除相关文件: git rm <file-path>"
Write-Host "3. 运行测试确保功能正常: npm run preflight"