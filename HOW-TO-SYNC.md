# 如何同步无登录版本

## 快速开始

### 方法1：使用 PowerShell 脚本（推荐）

```powershell
# 运行同步脚本
.\sync-no-login.ps1

# 检查是否有登录文件被重新引入
.\check-login-files.ps1

# 运行测试
npm run preflight
```

### 方法2：手动同步步骤

#### 步骤1：拉取官方更新

```bash
git checkout main
git pull origin main
```

#### 步骤2：合并到无登录分支

```bash
git checkout leeoohoo/gemini_cli_no_login
git merge main --no-commit --no-ff
```

#### 步骤3：处理登录文件

```bash
# 查看哪些文件有冲突或变化
git status

# 如果登录文件被重新引入，删除它们
git rm packages/cli/src/config/auth.ts
git rm packages/cli/src/ui/auth/*.tsx
# ... 根据实际情况删除其他登录文件
```

#### 步骤4：提交合并

```bash
git commit -m "chore: merge upstream changes (main -> leeoohoo/gemini_cli_no_login)

- Merge latest changes from official repository
- Maintain no-login modifications
- Exclude re-introduced authentication files"
```

#### 步骤5：推送到你的仓库

```bash
git push myrepo leeoohoo/gemini_cli_no_login
```

## 常见问题处理

### 问题1：合并冲突

如果遇到合并冲突：

```bash
# 查看冲突文件
git status

# 手动解决冲突
# 编辑有冲突的文件，保留无登录版本的修改

# 标记冲突已解决
git add <resolved-file>

# 继续合并
git commit
```

### 问题2：登录功能被重新引入

如果发现登录功能被重新引入：

```bash
# 使用检查脚本
.\check-login-files.ps1

# 或者手动搜索
git grep -i "auth\|login\|oauth" -- "*.ts" "*.tsx"

# 删除相关文件
git rm <file-path>
```

### 问题3：配置文件冲突

配置文件（如 `config.ts`、`settings.json`）可能需要特殊处理：

1. 使用官方版本作为基础
2. 手动应用无登录版本的修改
3. 确保无登录相关配置被保留

## 最佳实践

### 1. 定期同步

- 建议每1-2周同步一次
- 避免积累太多变更，减少冲突

### 2. 同步前检查

```bash
# 查看官方仓库的最新提交
git log origin/main --oneline -n 10

# 查看是否有大的架构变更
git diff leeoohoo/gemini_cli_no_login...origin/main --stat
```

### 3. 同步后验证

```bash
# 运行完整测试
npm run preflight

# 检查基本功能
npm start -- --help
```

### 4. 记录变更

每次同步后，更新变更日志：

```markdown
## [日期] 同步记录

- 合并了官方 [版本/提交号]
- 处理了以下登录相关文件：
  - [文件1]
  - [文件2]
- 测试结果：[通过/失败]
```

## 自动化建议

### 设置定时任务（Windows）

1. 打开任务计划程序
2. 创建基本任务
3. 设置每周运行一次
4. 操作为：启动程序 `powershell.exe`
5. 参数：`-ExecutionPolicy Bypass -File "C:\path\to\sync-no-login.ps1"`

### Git Hooks（可选）

在 `.git/hooks/post-merge` 中添加检查脚本：

```bash
#!/bin/sh
# 合并后自动检查登录文件
powershell.exe -ExecutionPolicy Bypass -File "check-login-files.ps1"
```

## 紧急情况处理

### 如果同步失败

```bash
# 中止合并
git merge --abort

# 重置到合并前状态
git reset --hard HEAD

# 重新尝试
git checkout main
git pull origin main
git checkout leeoohoo/gemini_cli_no_login
# 重新开始合并
```

### 如果需要回退

```bash
# 查看提交历史
git log --oneline -n 20

# 回退到指定提交
git reset --hard <commit-hash>

# 强制推送到仓库
git push myrepo leeoohoo/gemini_cli_no_login --force
```

## 联系支持

如有问题，请参考：

- `README-NO-LOGIN.md` - 详细文档
- 官方仓库：https://github.com/google-gemini/gemini-cli
- 你的仓库：https://github.com/leeoohoo/gemini_cli_no_login
