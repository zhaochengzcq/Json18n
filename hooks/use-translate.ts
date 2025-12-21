import { useState, useCallback } from 'react';
import { findMissingTranslations, type JsonObject } from '@/lib/utils/json-diff';
import { mergeTranslations } from '@/lib/utils/json-merge';

// 类型定义
interface TranslateOptions {
  sourceJson: JsonObject;
  targetJson: JsonObject; // 可以是空对象 {}
  sourceLang: string;
  targetLang: string;
  context?: string; // 用户输入的额外提示，如 "App 里的按钮文案"
  apiKey?: string; // 扩展点：如果支持用户填自己的 Key
}

interface TranslateResult {
  success: boolean;
  mergedJson: JsonObject | null;
  translatedCount: number;
  message?: string;
}

export function useTranslate() {
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(async ({
    sourceJson,
    targetJson,
    sourceLang,
    targetLang,
    context
  }: TranslateOptions): Promise<TranslateResult> => {
    setIsTranslating(true);
    setError(null);

    try {
      // 1. 本地计算 Diff (极速，无需网络)
      // 注意：这里我们不需要 obsoleteKeys，只关心 missingKeys
      const { missingKeys } = findMissingTranslations(sourceJson, targetJson);
      const keysCount = Object.keys(missingKeys).length;

      // 🛑 边界检查：如果没有缺漏，直接返回
      if (keysCount === 0) {
        return {
          success: true,
          mergedJson: targetJson, // 原样返回
          translatedCount: 0,
          message: "No missing keys found. Files are in sync."
        };
      }

      // 2. 调用 Next.js API
      const response = await fetch('/api/translate/grop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLang,
          targetLang,
          content: missingKeys, // 只发送缺失部分，省 Token
          context
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Translation API failed');
      }

      const { translatedKeys } = await response.json();

      // 3. 本地合并逻辑 (安全回填)
      // 默认开启 safe mode (overwrite: false)，这由 mergeTranslations 内部默认值保证
      const mergeResult = mergeTranslations(targetJson, translatedKeys);

      return {
        success: true,
        mergedJson: mergeResult.merged,
        translatedCount: keysCount,
        message: mergeResult.errors.length > 0 
          ? `Translated ${keysCount} keys with ${mergeResult.errors.length} merge warnings.`
          : `Successfully translated ${keysCount} keys.`
      };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMsg);
      return {
        success: false,
        mergedJson: null,
        translatedCount: 0,
        message: errorMsg
      };
    } finally {
      setIsTranslating(false);
    }
  }, []);

  return {
    translate,
    isTranslating,
    error
  };
}