import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";

// 配置常量
const MAX_KEYS_PER_REQUEST = 50; // MVP 策略：限制单次 Key 数量，防止超时/爆Token

const TranslateRequestSchema = z.object({
  sourceLang: z.string().min(2),
  targetLang: z.string().min(2),
  content: z.record(z.string(), z.string()), 
  context: z.string().optional(),
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = TranslateRequestSchema.safeParse(body);

    if (!validation.success) {
      // Zod 错误一般是前端传参格式不对，可以适当透出，方便调试
      return NextResponse.json(
        { error: "Invalid request format", details: validation.error },
        { status: 400 }
      );
    }

    const { sourceLang, targetLang, content, context } = validation.data;
    const keysToTranslate = Object.keys(content);

    // 🛑 Risk 2: 断路器 (Circuit Breaker)
    if (keysToTranslate.length > MAX_KEYS_PER_REQUEST) {
      return NextResponse.json(
        { 
          error: "Payload too large", 
          message: `MVP Limit: Please translate max ${MAX_KEYS_PER_REQUEST} keys at a time. Current: ${keysToTranslate.length}` 
        },
        { status: 413 } // 413 Payload Too Large
      );
    }

    // 🛡️ MOCK 模式
    if (process.env.MOCK_AI === "true") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const mockedResult: Record<string, string> = {};
      keysToTranslate.forEach((key) => {
        mockedResult[key] = `[${targetLang.toUpperCase()}] ${content[key]}`;
      });
      return NextResponse.json({ translatedKeys: mockedResult });
    }

    const systemPrompt = `
      You are a professional localization engine.
      Translate from "${sourceLang}" to "${targetLang}".
      Output strictly valid JSON.
      Do NOT translate variables like "{name}".
      ${context ? `Context: ${context}` : ""}
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(content) },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const resultString = completion.choices[0].message.content;

    if (!resultString) {
      throw new Error("AI returned empty response");
    }

    let rawTranslatedKeys: Record<string, string>;
    try {
      rawTranslatedKeys = JSON.parse(resultString);
    } catch (e) {
      // AI 返回了非 JSON 格式，这是严重的服务端错误
      console.error("AI JSON Parse Error:", resultString);
      throw new Error("AI provider returned invalid format");
    }

    // 🛑 Risk 1: 白名单校验 (The "Key Guard")
    // 我们只接受那些我们发送出去的 keys。
    // 如果 AI 幻觉生成了 "new_key": "...", 直接丢弃。
    // 如果 AI 漏掉了 "old_key"，我们也不补（前端会看到它依然是 missing，下次再翻）。
    const safeResult: Record<string, string> = {};
    
    for (const key of keysToTranslate) {
      // 只有当 AI 返回了该 key，且必须是字符串时才采纳
      if (
        Object.prototype.hasOwnProperty.call(rawTranslatedKeys, key) &&
        typeof rawTranslatedKeys[key] === "string"
      ) {
        safeResult[key] = rawTranslatedKeys[key];
      }
    }

    return NextResponse.json({ translatedKeys: safeResult });

  } catch (error: any) {
    // 🛑 Risk 3: 错误屏蔽 (Error Masking)
    // 在服务端打印完整日志
    console.error("🔥 Translation API Error:", error);

    // 给前端返回通用的错误信息
    return NextResponse.json(
      { 
        error: "Translation Failed", 
        message: "The AI service encountered an issue. Please try again." 
      },
      { status: 500 }
    );
  }
}