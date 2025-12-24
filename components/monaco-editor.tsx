"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// 懒加载 Monaco Editor，避免 SSR 问题和首屏加载
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-400">
      <Loader2 className="w-5 h-5 animate-spin mr-2" />
      <span className="text-sm">Loading editor...</span>
    </div>
  ),
});

interface JsonEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
}

export function JsonEditor({
  value,
  onChange,
  readOnly = false,
  placeholder,
  className = "",
}: JsonEditorProps) {
  const handleChange = (newValue: string | undefined) => {
    if (onChange && newValue !== undefined) {
      onChange(newValue);
    }
  };

  // 如果是空值且有 placeholder，显示 placeholder
  const showPlaceholder = !value && placeholder && readOnly;

  if (showPlaceholder) {
    return (
      <div className={`flex-1 p-4 font-mono text-sm text-slate-300 whitespace-pre-wrap ${className}`}>
        {placeholder}
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      defaultLanguage="json"
      value={value}
      onChange={handleChange}
      options={{
        readOnly,
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        tabSize: 2,
        automaticLayout: true,
        folding: true,
        bracketPairColorization: { enabled: true },
        formatOnPaste: false, // 粘贴时不自动格式化（尊重用户意图）
        formatOnType: false,
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
        padding: { top: 12, bottom: 12 },
        renderValidationDecorations: "on", // 显示 JSON 错误
        // 占位符通过外部处理
      }}
      theme="vs" // 使用浅色主题与界面一致
      className={className}
    />
  );
}

// 格式化 JSON 工具函数
export function formatJson(jsonString: string): { success: boolean; result: string; error?: string } {
  try {
    const parsed = JSON.parse(jsonString);
    const formatted = JSON.stringify(parsed, null, 2);
    return { success: true, result: formatted };
  } catch (e) {
    return { 
      success: false, 
      result: jsonString, 
      error: e instanceof Error ? e.message : "Invalid JSON" 
    };
  }
}
