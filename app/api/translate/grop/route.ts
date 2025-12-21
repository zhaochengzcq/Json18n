import { NextResponse } from "next/server";
import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import { z } from "zod";
import { jsonrepair } from "jsonrepair"; 

// --- 1. 环境配置与检查 ---
// 强制检查 API Key，防止运行时莫名失败
if (!process.env.GROQ_API_KEY) {
  throw new Error("❌ MISSING_ENV: GROQ_API_KEY is not set.");
}

// 代理配置 (本地开发如果开了 VPN 通常需要)
// const proxyUrl = process.env.HTTPS_PROXY;
// const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

// if (proxyUrl) console.log(`[System] Proxy detected: ${proxyUrl}`);

// --- 2. 初始化 OpenAI 客户端 (Groq) ---
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1",
  // httpAgent: agent,
});

// --- 3. 校验规则 (Zod) ---
// 定义递归 Schema 以支持嵌套 JSON (如: { "auth": { "login": "登录" } })
// const LiteralSchema = z.string();
// const JsonSchema: z.ZodType<any> = z.lazy(() =>
//   z.union([LiteralSchema, z.record(JsonSchema)])
// );

// const TranslateRequestSchema = z.object({
//   sourceLang: z.string().min(1),
//   targetLang: z.string().min(1),
//   content: z.record(JsonSchema), // 支持任意深度的 JSON 对象
//   context: z.string().optional(),
// });

// --- 3. 校验规则 (Zod) ---
// 🔄 修正：简化 Schema，移除导致崩溃的递归校验
// 我们只校验最外层是否为对象，内部结构由 JSON.parse 和后续逻辑处理
const TranslateRequestSchema = z.object({
  sourceLang: z.string().min(1),
  targetLang: z.string().min(1),
  // 关键修改：不再使用 z.lazy 和递归，直接允许 value 为任意类型
  // 这足以过滤掉非 JSON 对象，且不会导致 Next.js 运行时崩溃
  // content: z.record(z.string(), z.any()), 
  content: z.any(), // 放宽校验，交给 AI 处理结构
  context: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // 1. 解析 Request Body
    const body = await req.json();
    
    // 2. 验证参数格式
    const { sourceLang, targetLang, content, context } = TranslateRequestSchema.parse(body);

    // 3. 空值快速返回 (节省 Token)
    if (Object.keys(content).length === 0) {
      return NextResponse.json({ translatedKeys: {} });
    }

    // 3.5 赋值语言名称 (用于提示词)
    const sourceLangName = sourceLang;
    const targetLangName = targetLang;

    // 4. 构建 System Prompt (核心修复点)
    // 🔄 针对你的“空值”问题进行了 3 点特定优化：
    // A. 明确告诉 AI key 可能是 "meta.app_name" 这种点分格式，不要去动它。
    // B. 强制要求 "Translate the value"，严禁留空。
    // C. 给出具体的示例 (Example)，教它怎么做。
    const systemPrompt = `
You are a professional i18n localization engine.
Task: Translate the JSON values from "${sourceLangName}" to "${targetLangName}".

CRITICAL INSTRUCTIONS:
1. **TRANSLATE THE VALUES**: Do NOT leave strings empty. Do NOT just copy the source unless it's a proper noun.
2. **PRESERVE KEYS**: Input keys may use dot notation (e.g., "meta.app_name"). KEEP THEM EXACTLY AS IS. Do not expand them into objects.
3. **PRESERVE VARIABLES**: Keep {name}, {{count}}, %s, <br/>, HTML tags exactly as they are.
4. **JSON ONLY**: Output valid JSON.

Example:
Input: { "nav.home": "Home", "btn.save": "Save" }
Output: { "nav.home": "首页", "btn.save": "保存" }

Context: ${context || "UI Strings"}.
`.trim();

    // 5. 调用 LLM
    const completion = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile", // 推荐模型：速度快，成本低，适合翻译
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(content) },
      ],
      response_format: { type: "json_object" }, // 强制 JSON 模式
      temperature: 0.1, // 低温增加确定性
    });

    const resultText = completion.choices[0].message.content || "{}";

    // 6. 解析与修复 (Robustness)
    let translatedKeys = {};
    try {
      // 第一层防御：移除可能残留的 Markdown 标记
      const rawText = resultText.replace(/```json|```/g, "").trim();
      
      // 第二层防御：使用 jsonrepair 修复 AI 可能遗漏的逗号或括号
      const cleanJson = jsonrepair(rawText);
      
      translatedKeys = JSON.parse(cleanJson);
    } catch (e) {
      console.error("❌ JSON Repair/Parse Failed. Raw Output:", resultText);
      return NextResponse.json(
        { 
          error: "AI returned malformed JSON", 
          raw: resultText // 仅在 Parse 失败时返回原始文本供调试
        }, 
        { status: 502 }
      );
    }

    // --- (预留位: 在这里添加 Token 计费逻辑) ---
    // const tokensUsed = completion.usage?.total_tokens;
    
    // 7. 成功返回
    return NextResponse.json({ translatedKeys });

  } catch (error: any) {
    // --- 统一错误处理中心 ---
    
    // 始终在服务端打印完整日志
    console.error("❌ API Error:", error);

    const isDev = process.env.NODE_ENV === "development";

    // Case A: Zod 参数校验错误 (400)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid input format", 
          details: error.issues,
          ...(isDev && { stack: error.stack })
        }, 
        { status: 400 }
      );
    }

    // Case B: OpenAI/Groq API 错误 (401, 429, 500 等)
    if (error instanceof OpenAI.APIError) {
      return NextResponse.json(
        {
          error: "AI Provider Error",
          message: error.message,
          code: error.code,
          type: error.type,
          ...(isDev && { stack: error.stack, fullError: error })
        },
        { status: error.status || 502 }
      );
    }

    // Case C: 其他未知错误 (500)
    return NextResponse.json(
      { 
        error: error.message || "Internal Server Error",
        ...(isDev && { 
          stack: error.stack,
          cause: error.cause
        })
      }, 
      { status: 500 }
    );
  }
}