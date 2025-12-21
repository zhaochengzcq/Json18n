import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai"; // 引入 Google SDK
import { z } from "zod";

// --- 配置区域 ---
const MAX_KEYS_PER_REQUEST = 50; // MVP 限制，防止超时

// --- Zod 校验 ---
const TranslateRequestSchema = z.object({
  sourceLang: z.string().min(2),
  targetLang: z.string().min(2),
  content: z.record(z.string(), z.string()), // Missing Keys Map
  context: z.string().optional(),
});

// 初始化 Gemini 客户端
// ⚠️ 确保 .env.local 里有 GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export const maxDuration = 60; // 允许运行 60 秒 (Serverless Function)

export async function POST(req: Request) {
  try {
    // 1. 基础校验
    const body = await req.json();
    const validation = TranslateRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request format", details: validation.error },
        { status: 400 }
      );
    }

    const { sourceLang, targetLang, content, context } = validation.data;
    const keysToTranslate = Object.keys(content);

    // 2. 断路器 (Circuit Breaker)
    if (keysToTranslate.length > MAX_KEYS_PER_REQUEST) {
      return NextResponse.json(
        {
          error: "Payload too large",
          message: `Free Tier Limit: Max ${MAX_KEYS_PER_REQUEST} keys per sync. Current: ${keysToTranslate.length}`,
        },
        { status: 413 }
      );
    }

    // 3. MOCK 模式 (如需)
    if (process.env.MOCK_AI === "true") {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const mockedResult: Record<string, string> = {};
      keysToTranslate.forEach((key) => {
        mockedResult[key] = `[${targetLang.toUpperCase()}] ${content[key]}`;
      });
      return NextResponse.json({ translatedKeys: mockedResult });
    }

    // 4. 构建 Prompt
    const systemInstruction = `
      You are a strict localization engine.
      Task: Translate the JSON values from "${sourceLang}" to "${targetLang}".
      
      Rules:
      1. Output ONLY valid JSON. No markdown blocks, no explanations.
      2. Do NOT translate variables inside curly braces (e.g., "{name}", "{count}"). Keep them exactly as is.
      3. Do NOT translate HTML tags (e.g., "<b>", "<br/>").
      4. Keep the tone concise and professional (SaaS UI style).
      ${context ? `Context: ${context}` : ""}
    `;

    // 5. 调用 Gemini 1.5 Flash (免费且快)
    // 这里的 trick 是我们把 input data 放在 prompt 里，
    // 因为 gemini 对 JSON schema 的支持很好，但也支持直接 prompt 输出
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json", // 强制 JSON 模式
      },
    });

    // 组合 Prompt
    const prompt = `${systemInstruction}\n\nInput JSON to translate:\n${JSON.stringify(
      content
    )}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Gemini returned empty response");
    }

    let rawTranslatedKeys: Record<string, string>;
    try {
      rawTranslatedKeys = JSON.parse(text);
    } catch (e) {
      console.error("Gemini JSON Parse Error:", text);
      throw new Error("Invalid JSON format from AI");
    }

    // 6. 白名单安全过滤 (Safety Guard) - 逻辑同之前
    const safeResult: Record<string, string> = {};
    for (const key of keysToTranslate) {
      // 只有当 key 存在且是字符串时才采纳
      if (
        Object.prototype.hasOwnProperty.call(rawTranslatedKeys, key) &&
        typeof rawTranslatedKeys[key] === "string"
      ) {
        safeResult[key] = rawTranslatedKeys[key];
      }
    }

    return NextResponse.json({ translatedKeys: safeResult });
  } catch (error: any) {
    console.error("🔥 Gemini API Error:", error);
    return NextResponse.json(
      {
        error: "Translation Failed",
        message:
          "AI service is busy or encountered an error. Please try again.",
      },
      { status: 500 }
    );
  }
}
