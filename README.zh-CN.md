# i18n JSON 自动翻译器

> AI 驱动的 i18n JSON 翻译，具有智能差异检测和安全合并

一个 Next.js Web 应用，使用 AI（OpenAI、Google Gemini 或 Groq）自动化 i18n JSON 文件的翻译。在本地检测缺失的翻译键，仅将缺失内容发送给 LLM，安全地合并结果而不会覆盖现有值。

**[🚀 在线演示](https://i18n-json-auto-translator-46h8mbp8z.vercel.app/)**

![Built with Next.js 16](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)
![React 19](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

## ✨ 核心特性

- **🔍 智能差异检测**: 通过比较源 JSON 和目标 JSON 文件，自动检测缺失的翻译键
- **🚀 Token 高效**: 仅发送缺失的键给 LLM，显著降低 API 成本和延迟
- **🔒 安全合并**: 保证现有翻译永远不会被覆盖，仅添加新键
- **🤖 多 LLM 支持**: 可选择 OpenAI GPT-4o、Google Gemini 或 Groq（Llama 3.3）
- **📊 实时可视化**: 带颜色编码的差异查看器，展示翻译覆盖率和缺失键
- **🌍 全球语言支持**: 50+ 种语言，包括中日韩
- **⚙️ 零复杂度**: 保留 JSON 结构和占位符变量（`{name}`、`{{count}}`、`%s`）

## � 适用人群

✅ 维护基于 JSON 的 i18n 开发者（React / Vue / Next.js）
✅ 希望使用 AI 翻译但不覆盖现有键的团队

❌ 不是完整的 TMS（Crowdin、Lokalise）
❌ 暂不支持非 JSON 格式

## �🚀 快速开始

### 系统要求

- Node.js 18+
- pnpm 10.26+
- 至少一个 LLM API Key：
  - OpenAI: `OPENAI_API_KEY`
  - Google: `GEMINI_API_KEY`
  - Groq: `GROQ_API_KEY`（推荐 - 免费额度、最快）

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/i18n-json-auto-translator.git
cd i18n-json-auto-translator

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入你的 API Key
```

### 环境变量配置

```bash
# LLM API Key（至少需要一个）
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GROQ_API_KEY=gsk_...

# 可选：产品分析
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com

# 可选：开发环境（中国地区/VPN）
HTTPS_PROXY=http://127.0.0.1:7890

# 测试模式（跳过 LLM 调用，仅 Gemini/GPT）
MOCK_AI=true
```

### 本地开发

```bash
# 启动开发服务器
pnpm dev

# 打开 http://localhost:3000
# 上传 en.json（源文件）和 zh.json（目标文件）
# 应用将自动检测缺失的键并进行翻译
```

### 生产环境构建

```bash
pnpm build
pnpm start
```

## 📖 使用示例

### 输入文件

**源 JSON（en.json）**:
```json
{
  "app": {
    "name": "MyApp",
    "welcome": "Welcome, {name}!"
  },
  "buttons": {
    "save": "Save",
    "cancel": "Cancel"
  }
}
```

**目标 JSON（zh.json）**（不完整）:
```json
{
  "app": {
    "name": "MyApp"
  },
  "buttons": {}
}
```

### 输出结果

**合并后的目标 JSON**（由 AI 翻译）:
```json
{
  "app": {
    "name": "MyApp",
    "welcome": "欢迎，{name}！"
  },
  "buttons": {
    "save": "保存",
    "cancel": "取消"
  }
}
```

**发生的事情**:
1. ✅ `app.name` 保留（已存在）
2. ✅ `app.welcome` 翻译（缺失）
3. ✅ `buttons.save` 翻译（缺失）
4. ✅ `buttons.cancel` 翻译（缺失）
5. ✅ 变量 `{name}` 保留
6. ✅ JSON 结构保持不变

## 🌐 支持的语言

50+ 种语言，包括：

**东亚语言**: 中文（简体/繁体）、日语、韩语  
**东南亚语言**: 泰语、越南语、印度尼西亚语、马来语、菲律宾语、老挝语、缅甸语  
**欧洲语言**: 英语、西班牙语、法语、德语、意大利语、葡萄牙语、波兰语、荷兰语  
**其他语言**: 阿拉伯语、希伯来语、印地语、俄语、土耳其语等

完整列表见 [lib/constants/languages.ts](lib/constants/languages.ts)。

## 🏗️ 系统架构

### 3 阶段管道

```
┌─────────────────────────────────────────────────────┐
│ 1. 本地差异检测（客户端，即时）                      │
│    比较源 JSON 与目标 JSON                          │
│    提取缺失的键作为扁平化映射                        │
│    例如: { "auth.login": "登录" }                  │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 2. AI 翻译（服务器端 API）                          │
│    仅将缺失的键发送给 LLM                           │
│    应用安全守护和 JSON 修复                         │
│    返回 { translatedKeys: {...} }                  │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 3. 安全合并（客户端，无覆盖）                        │
│    重建嵌套 JSON 结构                               │
│    保留现有值（overwrite: false）                  │
│    返回合并后的 JSON 文件                           │
└─────────────────────────────────────────────────────┘
```

### 核心组件

- **lib/utils/json-diff.ts**: 智能差异算法
- **lib/utils/json-merge.ts**: 安全合并逻辑
- **app/api/translate/{gemini,gpt,grop}**: LLM 集成路由
- **hooks/use-translate.ts**: 前端状态管理
- **app/page.tsx**: 带实时可视化的 UI

## 🔒 安全保证

1. **白名单验证**: 仅返回我们发送的键
2. **JSON 修复**: 修复格式错误的 LLM 输出
3. **结构保护**: 嵌套对象保持完整
4. **无覆盖保护**: 现有值永远不会被修改
5. **错误隔离**: API Key 错误永远不会泄露给客户端

## 🧪 测试

### 手动测试工作流

```bash
# 1. 启动开发服务器
pnpm dev

# 2. 上传测试 JSON 文件
# - 源文件: en.json（完整翻译）
# - 目标文件: {} （空对象）

# 3. 验证差异检测
# 预期: 所有键都标记为缺失

# 4. 检查翻译质量
# 预期: 非空，内容合理的翻译

# 5. 检查合并后的 JSON
# 预期: 结构保留，没有覆盖
```

### 覆盖的边界情况

- 空目标 JSON → 翻译所有源键
- 部分翻译 → 跳过现有，添加缺失
- 嵌套对象混合多种类型
- 含占位符的字符串：`{name}`、`{{count}}`、`%s`
- 含 HTML/标记的字符串：`<b>粗体</b>`、`<i>斜体</i>`
- 数组 → 跳过（MVP 不支持）

## 📊 LLM 对比表

| 模型 | 速度 | 成本 | 可靠性 | 最适合 |
|------|------|------|--------|--------|
| Groq (Llama 3.3) | ⚡ 最快 | 🆓 免费 | ✅ 好 | **推荐** |
| Gemini 2.5 Flash | 🚀 很快 | 💰 便宜 | ✅ 好 | 高频使用 |
| GPT-4o Mini | 🟡 中等 | 💸 较贵 | ✅✅ 优秀 | 质量优先 |

**默认选择**: Groq（最快 + 免费额度友好）

## 🛠️ 开发指南

### 项目结构

```
├── app/
│   ├── page.tsx              # 主 UI 组件
│   ├── providers.tsx         # PostHog 分析
│   └── api/translate/
│       ├── gemini/route.ts
│       ├── gpt/route.ts
│       └── grop/route.ts     # Groq（注意：typo 是故意的）
├── hooks/
│   └── use-translate.ts      # 翻译逻辑 hook
├── lib/
│   ├── utils/
│   │   ├── json-diff.ts      # 差异算法
│   │   └── json-merge.ts     # 安全合并逻辑
│   └── constants/
│       └── languages.ts      # 支持的语言
├── components/
│   └── ui/                   # Radix UI 组件
├── test/
│   └── test-*.ts            # 单元测试占位符
└── public/                   # 静态资源
```

### 可用命令

```bash
pnpm dev      # 启动开发服务器 (http://localhost:3000)
pnpm build    # 生产环境构建
pnpm start    # 运行生产服务器
pnpm lint     # 运行 ESLint
```

### 添加新的 LLM 提供商

1. 创建 `app/api/translate/<provider>/route.ts`
2. 以 `app/api/translate/grop/route.ts` 为模板
3. 更新 API 端点和模型名称
4. 先用 `MOCK_AI=true` 测试
5. 如需要，更新前端 `hooks/use-translate.ts`

## 📈 分析统计（可选）

该项目支持客户端产品分析（例如 PostHog 或类似工具）。

环境变量示例：

```bash
NEXT_PUBLIC_ANALYTICS_KEY=...
NEXT_PUBLIC_ANALYTICS_HOST=...
```

典型事件包括：
- 翻译请求
- 成功/失败结果
- 错误追踪

## 🐛 故障排查

**问题**: "API Error: Missing GROQ_API_KEY"  
**解决**: 检查 `.env.local` 是否包含 `GROQ_API_KEY=gsk_...`

**问题**: 翻译为空或不正确  
**解决**: 设置 `MOCK_AI=true` 来在不调用 API 的情况下测试 UI

**问题**: JSON 合并失败  
**解决**: 确保源 JSON 具有有效的嵌套结构

**问题**: 大文件超时  
**解决**: 将 JSON 拆分为较小的文件（每次请求最多 50 个键）

## 📄 许可证

MIT 许可证 - 详见 LICENSE 文件

## 🤝 贡献指南

欢迎贡献！请：

1. Fork 本仓库
2. 创建特性分支
3. 充分测试（参考上面的手动测试工作流）
4. 提交 Pull Request

## 🔗 相关链接

- **问题追踪**: [GitHub Issues](https://github.com/yourusername/i18n-json-auto-translator/issues)
- **讨论区**: [GitHub Discussions](https://github.com/yourusername/i18n-json-auto-translator/discussions)

## 💡 应用场景

- **SaaS 团队**: 在 CI/CD 管道中自动化 i18n 键检测
- **本地化团队**: 使用 AI 加速翻译工作流
- **创业公司**: 快速支持新市场，无需手动管理翻译
- **开源项目**: 社区管理的翻译，具有安全保障

## 🚀 开发计划

以下项目反映了可能的未来方向：

- [ ] 批量文件处理
- [ ] 翻译前成本估算
- [ ] Web API 以供程序化访问

开发计划项目处于探索性阶段，可能会有变化。

---

用 ❤️ 为关心 i18n 质量的开发者打造。

有问题？请开启一个 [Issue](https://github.com/yourusername/i18n-json-auto-translator/issues) 或 [Discussion](https://github.com/yourusername/i18n-json-auto-translator/discussions)。
