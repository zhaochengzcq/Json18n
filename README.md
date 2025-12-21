# i18n JSON Auto Translator

> AI-powered i18n JSON translation with intelligent diff detection & safe merge

A Next.js web application that automates the translation of i18n JSON files using AI (OpenAI, Google Gemini, or Groq). Detects missing translation keys locally, sends only missing content to LLM, and safely merges results without overwriting existing values.

![Built with Next.js 16](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)
![React 19](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)

## ✨ Features

- **🔍 Intelligent Diff Detection**: Automatically detects missing translation keys by comparing source and target JSON files locally
- **🚀 Token-Efficient**: Sends only missing keys to LLM, reducing API costs and latency
- **🔒 Safe Merge**: Guarantees existing translations are never overwritten; adds only new keys
- **🤖 Multi-LLM Support**: Choose between OpenAI GPT-4o, Google Gemini, or Groq (Llama 3.3)
- **📊 Real-time Visualization**: See translation coverage and missing keys with color-coded diff viewer
- **🌍 Global Language Support**: 50+ languages including CJK (Chinese, Japanese, Korean)
- **⚙️ Zero Complexity**: Preserves JSON structure and placeholder variables (`{name}`, `{{count}}`, `%s`)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 10.26+
- At least one LLM API key:
  - OpenAI: `OPENAI_API_KEY`
  - Google: `GEMINI_API_KEY`
  - Groq: `GROQ_API_KEY` (recommended - free tier, fastest)

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/i18n-json-auto-translator.git
cd i18n-json-auto-translator

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your API keys
```

### Environment Variables

```bash
# LLM API Keys (at least one required)
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
GROQ_API_KEY=gsk_...

# Optional: Product Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.posthog.com

# Optional: Development (China region/VPN)
HTTPS_PROXY=http://127.0.0.1:7890

# Testing mode (bypass LLM calls, Gemini/GPT only)
MOCK_AI=true
```

### Development

```bash
# Start dev server
pnpm dev

# Open http://localhost:3000
# Upload en.json (source) and zh.json (target)
# App detects missing keys and translates them
```

### Build for Production

```bash
pnpm build
pnpm start
```

## 📖 Usage Example

### Input
**Source JSON (en.json)**:
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

**Target JSON (zh.json)** (incomplete):
```json
{
  "app": {
    "name": "MyApp"
  },
  "buttons": {}
}
```

### Output
**Merged Target JSON** (translated by AI):
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

**What happens**:
1. ✅ `app.name` preserved (existing)
2. ✅ `app.welcome` translated (missing)
3. ✅ `buttons.save` translated (missing)
4. ✅ `buttons.cancel` translated (missing)
5. ✅ Variables `{name}` preserved
6. ✅ JSON structure maintained

## 🌐 Supported Languages

50+ languages including:

**East Asian**: Chinese (Simplified/Traditional), Japanese, Korean  
**Southeast Asian**: Thai, Vietnamese, Indonesian, Malay, Filipino, Lao, Burmese  
**European**: English, Spanish, French, German, Italian, Portuguese, Polish, Dutch  
**Others**: Arabic, Hebrew, Hindi, Russian, Turkish, and more

See [lib/constants/languages.ts](lib/constants/languages.ts) for complete list.

## 🏗️ Architecture

### 3-Stage Pipeline

```
┌─────────────────────────────────────────────────────┐
│ 1. LOCAL DIFF (Client-side, instant)                │
│    Compare Source JSON vs Target JSON               │
│    Extract missing keys as flat map                 │
│    Example: { "auth.login": "Login" }              │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 2. AI TRANSLATION (Server-side API)                 │
│    Send only missing keys to LLM                    │
│    Apply safety guards & JSON repair               │
│    Return { translatedKeys: {...} }                │
└─────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────┐
│ 3. SAFE MERGE (Client-side, no overwrite)          │
│    Reconstruct nested JSON structure                │
│    Preserve existing values (overwrite: false)      │
│    Return merged JSON file                          │
└─────────────────────────────────────────────────────┘
```

### Key Components

- **lib/utils/json-diff.ts**: Intelligent diff algorithm
- **lib/utils/json-merge.ts**: Safe merge with write guards
- **app/api/translate/{gemini,gpt,grop}**: LLM integration routes
- **hooks/use-translate.ts**: Frontend state management
- **app/page.tsx**: UI with real-time visualization

## 🔒 Safety Guarantees

1. **Whitelist Validation**: Only returns keys we sent
2. **JSON Repair**: Fixes malformed LLM output
3. **Structure Preservation**: Nested objects remain intact
4. **No Overwrites**: Existing values are never modified
5. **Error Isolation**: API key errors never leak to client

## 🧪 Testing

### Manual Testing Workflow

```bash
# 1. Start dev server
pnpm dev

# 2. Upload test JSONs
# - Source: en.json (complete translations)
# - Target: {} (empty)

# 3. Verify diff detection
# Expected: All keys marked as missing

# 4. Check translation quality
# Expected: Non-empty, context-aware translations

# 5. Inspect merged JSON
# Expected: Structure preserved, no overwrites
```

### Edge Cases Covered

- Empty target JSON → translate all source keys
- Partial translations → skip existing, add missing
- Nested objects with mixed types
- Strings with placeholders: `{name}`, `{{count}}`, `%s`
- HTML/markup in strings: `<b>Bold</b>`, `<i>Italic</i>`
- Arrays → skipped (not supported in MVP)

## 📊 LLM Comparison

| Model | Speed | Cost | Reliability | Best For |
|-------|-------|------|-------------|----------|
| Groq (Llama 3.3) | ⚡ Fastest | 🆓 Free tier | ✅ Good | **Recommended** |
| Gemini 2.5 Flash | 🚀 Very Fast | 💰 Cheap | ✅ Good | High volume |
| GPT-4o Mini | 🟡 Moderate | 💸 Higher | ✅✅ Excellent | Quality priority |

**Default**: Groq (fastest + free tier friendly)

## 🛠️ Development

### Project Structure

```
├── app/
│   ├── page.tsx              # Main UI component
│   ├── providers.tsx         # PostHog analytics
│   └── api/translate/
│       ├── gemini/route.ts
│       ├── gpt/route.ts
│       └── grop/route.ts     # Groq (note: typo is intentional)
├── hooks/
│   └── use-translate.ts      # Translation logic hook
├── lib/
│   ├── utils/
│   │   ├── json-diff.ts      # Diff algorithm
│   │   └── json-merge.ts     # Safe merge logic
│   └── constants/
│       └── languages.ts      # Supported languages
├── components/
│   └── ui/                   # Radix UI components
├── test/
│   └── test-*.ts            # Placeholder for unit tests
└── public/                   # Static assets
```

### Available Scripts

```bash
pnpm dev      # Start dev server (http://localhost:3000)
pnpm build    # Production build
pnpm start    # Run production server
pnpm lint     # Run ESLint
```

### Adding a New LLM Provider

1. Create `app/api/translate/<provider>/route.ts`
2. Copy from `app/api/translate/grop/route.ts` as template
3. Update API endpoint and model name
4. Test with `MOCK_AI=true` first
5. Update frontend `hooks/use-translate.ts` if needed

## 📈 Analytics (Optional)

This project supports client-side product analytics (e.g. PostHog or similar tools).

Environment variables (example):

```bash
NEXT_PUBLIC_ANALYTICS_KEY=...
NEXT_PUBLIC_ANALYTICS_HOST=...
```

Typical events include:
- translation attempts
- success / failure outcomes
- error tracking

## 🐛 Troubleshooting

**Problem**: "API Error: Missing GROQ_API_KEY"  
**Solution**: Check `.env.local` has `GROQ_API_KEY=gsk_...`

**Problem**: Translations are empty or incorrect  
**Solution**: Set `MOCK_AI=true` to test UI without API calls

**Problem**: JSON merge fails  
**Solution**: Ensure source JSON has valid nested structure

**Problem**: Large files timeout  
**Solution**: Split into smaller JSON files (max 50 keys per request)

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Test thoroughly (manual testing workflow above)
4. Submit a pull request

## 🔗 Links

- **Issue Tracker**: [GitHub Issues](https://github.com/yourusername/i18n-json-auto-translator/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/i18n-json-auto-translator/discussions)

## 💡 Use Cases

- **SaaS Teams**: Automate i18n key detection in CI/CD pipelines
- **Localization Teams**: Speed up translation workflows with AI
- **Startups**: Quickly support new markets without manual translation management
- **Open Source Projects**: Community-managed translations with safety guarantees

## 🚀 Roadmap

## 🚀 Roadmap

The following items reflect possible future directions:

- [ ] Batch file processing
- [ ] Cost estimation before translation
- [ ] Web API for programmatic access

Roadmap items are exploratory and subject to change.


---

Built with ❤️ for developers who care about i18n quality.

Questions? Open an [issue](https://github.com/yourusername/i18n-json-auto-translator/issues) or [discussion](https://github.com/yourusername/i18n-json-auto-translator/discussions).
