# Gemini CLI 无登录版本

这是一个移除了登录认证系统的 Gemini CLI 分支版本。

## 主要修改

### 已删除的功能

1. **Google OAuth 登录** - 移除了所有 Google 账户登录相关代码
2. **认证对话框** - 删除了 AuthDialog、ApiAuthDialog 等 UI 组件
3. **认证命令** - 移除了 `/auth` 命令和相关处理器
4. **认证配置** - 删除了认证相关的配置和验证逻辑

### 新增的功能

1. **OpenAI 配置支持** - 添加了 OpenAI API 配置示例
2. **无登录模式** - 修改了配置系统以支持无登录运行
3. **OpenAI 内容生成器** - 添加了 OpenAI 模型支持

## 同步策略

### 保持与官方仓库同步

为了保持与官方 Gemini CLI 的功能同步，同时避免重新引入登录功能，请使用以下方法：

#### 方法1：使用同步脚本（推荐）

```bash
# 给予执行权限（首次运行）
chmod +x sync-no-login.sh

# 运行同步脚本
./sync-no-login.sh
```

#### 方法2：手动同步步骤

1. 拉取官方更新：

   ```bash
   git checkout main
   git pull origin main
   ```

2. 合并到无登录分支：

   ```bash
   git checkout leeoohoo/open_gemini_cli
   git merge main --no-commit --no-ff
   ```

3. 检查并删除重新引入的登录文件：

   ```bash
   # 查看哪些登录文件被重新引入
   git status

   # 删除登录文件（如果需要）
   git rm packages/cli/src/config/auth.ts
   git rm packages/cli/src/ui/auth/*.tsx
   # ... 其他登录文件
   ```

4. 提交合并：

   ```bash
   git commit -m "chore: merge upstream changes (main -> leeoohoo/open_gemini_cli)"
   ```

5. 推送到你的仓库：
   ```bash
   git push myrepo leeoohoo/open_gemini_cli
   ```

### 处理合并冲突

当合并时遇到冲突，特别是配置文件冲突时：

1. **配置文件冲突**（如 `config.ts`, `settings.json`）：
   - 优先保留无登录版本的修改
   - 手动合并新增的功能配置

2. **新功能冲突**：
   - 检查新功能是否依赖登录系统
   - 如果依赖，可能需要修改或移除该依赖

## 开发建议

### 1. 定期同步

建议每1-2周同步一次官方更新，以避免积累太多变更。

### 2. 测试验证

每次同步后，运行完整测试：

```bash
npm run preflight
```

### 3. 监控登录相关变更

关注官方仓库的以下方面：

- 新的认证相关功能
- 配置系统的变更
- 依赖包的更新（特别是 @google/genai）

### 4. 创建检查清单

每次同步时检查：

- [ ] 是否有新的登录相关文件被引入
- [ ] 配置文件是否需要更新
- [ ] 依赖包是否需要更新
- [ ] 测试是否通过

## 故障排除

### 问题：合并后登录功能重新出现

**解决方案**：

1. 使用 `git log --oneline -n 20` 查看最近的提交
2. 找到引入登录功能的提交
3. 使用 `git revert <commit-hash>` 回退该提交
4. 或者手动删除登录文件后重新提交

### 问题：配置文件冲突无法解决

**解决方案**：

1. 备份当前配置文件
2. 使用官方版本作为基础
3. 手动应用无登录版本的修改
4. 测试确保功能正常

### 问题：依赖包冲突

**解决方案**：

1. 检查 `package.json` 和 `package-lock.json`
2. 优先使用官方版本的依赖（除非与无登录版本冲突）
3. 运行 `npm install` 更新依赖

## 联系与支持

如有问题，请参考：

- 官方文档：https://github.com/google-gemini/gemini-cli
- 本分支仓库：https://github.com/leeoohoo/open_gemini_cli

---

_最后更新：2026年1月21日_
