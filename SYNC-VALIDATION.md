# 同步验证流程

## 同步验证概述

同步验证用于确保从官方仓库同步的变更不会破坏无登录版本的核心约束（OpenAI 作为默认 provider、多模型解析逻辑、关键配置完整性等）。验证的目标是：

- 防止登录/认证相关逻辑被重新引入
- 保证 OpenAI 默认配置与模型解析行为正确
- 确保关键配置文件内容保持一致且可维护
- 提前发现功能与性能回归

验证流程概览：

1. 自动化保护与验证脚本
2. 多模型兼容性测试
3. 全量测试套件
4. 手动检查与场景验证
5. 必要时回滚并复验

## 自动化验证步骤

### 1. 配置保护验证

确保关键配置未被意外修改（provider 默认值、模型解析逻辑、provider 选择逻辑）。

```bash
bash ./scripts/protect-multi-model-config.sh
```

失败时请先查看 `git diff` 与相关文件差异并手动修复后再继续。

### 2. 同步完整性验证

统一执行保护检查、冲突检测和基础脚本测试。

```bash
bash ./scripts/validate-sync.sh
```

> 注意：该脚本要求已安装依赖（`npm ci`），且 `node_modules` 存在。

### 3. 多模型兼容性测试

该测试覆盖：provider 默认值、OpenAI 解析逻辑、provider 选择逻辑、OpenAI 生成器可用性、关键配置完整性。

```bash
npm --workspace @leeoohoo/open_gemini_cli test -- src/__tests__/multi-model-compatibility.test.ts
```

或进入子目录执行：

```bash
cd packages/cli
npm test -- src/__tests__/multi-model-compatibility.test.ts
```

### 4. 完整测试套件

```bash
npm run preflight
```

如果时间有限，可先运行轻量测试：

```bash
npm --workspace @leeoohoo/open_gemini_cli test -- src/__tests__/multi-model-compatibility.test.ts
npm --workspace @leeoohoo/open_gemini_cli test -- src/config/config.test.ts
```

## 手动验证步骤

### 关键配置文件检查清单

- `packages/cli/src/config/settingsSchema.ts`
  - `model.provider` 默认值为 `openai`
  - provider 选项不包含 Google-only 配置
- `packages/cli/src/config/config.ts`
  - `modelProvider` 回退值为 `openai`
  - OpenAI 默认模型解析逻辑正常
- `packages/core/src/core/contentGenerator.ts`
  - provider 默认选择逻辑正确（无 authType 时为 `openai`）

### 功能测试清单

- CLI 启动与帮助信息
  - `npm start -- --help`
- OpenAI 配置可读取（不强制联网）
  - 设置 `OPENAI_API_KEY` 与 `OPENAI_MODEL` 后启动 CLI
- 非交互模式验证
  - `gemini -p "hello"` 或 `npm start -- -p "hello"`

### 用户场景验证

- 常见配置场景：
  - 仅配置 OpenAI（默认 provider）
  - 设置 `OPENAI_MODEL` 和 `OPENAI_BASE_URL`
- 多模型场景：
  - 设置 `model.name` 与 `model.openai.model` 并确保解析顺序正确

### 性能基准测试

- 启动耗时（本地基线对比）
- 常用命令响应时间
- 资源占用（内存、CPU）

> 建议在同一台机器上对比同步前后的启动时间与响应时间。

## 回滚流程

### 何时需要回滚

- 自动化验证失败且短时间内无法修复
- 手动验证发现核心功能不可用
- OpenAI 默认 provider 被破坏或重新引入登录流程
- 性能明显退化且无法定位原因

### 回滚步骤（Git 操作）

```bash
# 查看最近提交
git log --oneline -n 20

# 回退到指定提交
git reset --hard <commit-hash>

# 强制推送到你的仓库
git push myrepo leeoohoo/open_gemini_cli --force
```

### 回滚后验证

- 重新运行自动化验证脚本
- 重新运行多模型兼容性测试
- 确认主要功能恢复正常

### 问题记录和跟踪

- 在 PR 或 issue 中记录失败原因、影响范围、回滚版本
- 记录修复计划与重新同步时间

## 验证工具和脚本

### 脚本使用方法

- 配置保护：
  ```bash
  bash ./scripts/protect-multi-model-config.sh
  ```
- 同步完整性验证：
  ```bash
  bash ./scripts/validate-sync.sh
  ```

### 测试命令参考

- 单测（核心）：
  ```bash
  npm --workspace @leeoohoo/open_gemini_cli test -- src/__tests__/multi-model-compatibility.test.ts
  ```
- 全量测试：
  ```bash
  npm run preflight
  ```

### 调试技巧

- 使用 `git diff` 定位配置变更
- 查看测试报告：`packages/cli/junit.xml`
- 针对某个用例：`npm test -- <path>`

## 常见问题和解决方案

### 配置冲突处理

- 优先保留无登录版本的 OpenAI 配置与 provider 默认值
- 如果上游更新了 provider 结构，手动合并并更新测试

### 测试失败排查

- 确认 `node_modules` 是否存在
- 先跑单测定位问题，再扩大范围
- 检查环境变量是否影响行为（`OPENAI_MODEL`、`GEMINI_MODEL`）

### 性能问题诊断

- 与上一次同步版本对比启动时间
- 通过 `npm run build` 观察构建变化
- 关注新增依赖或初始化逻辑

## 责任和流程

### 谁负责验证

- 同步执行人负责完成自动化验证
- PR 审核人负责手动验证与场景确认

### 验证时间要求

- 建议同步后 24 小时内完成验证并更新记录
- 若触发紧急回滚，需在 48 小时内补充说明

### 验证结果记录

建议在 PR 描述或同步日志中记录：

```markdown
## 同步验证记录

- 自动化验证：通过/失败
- 多模型兼容性测试：通过/失败
- 手动检查：通过/失败
- 性能对比：正常/异常
- 备注：
```
