"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Languages,
  FileJson,
  Code2,
  Zap,
  BrainCircuit,
  Copy,
  X,
  Eye,
  Edit3,
  ShieldCheck,
  Lock,
  Clock,
  RotateCcw,
  Wand2,
  Upload,
  Github
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslate } from "@/hooks/use-translate";
import { findMissingTranslations, type JsonObject, type JsonValue } from '@/lib/utils/json-diff';
import { LANGUAGES } from '@/lib/constants/languages';
import { JsonEditor, formatJson } from '@/components/monaco-editor';

// --- 🛠️ Utility Functions ---

const parseJson = (jsonString: string): JsonObject | null => {
  try {
    const parsed = JSON.parse(jsonString);
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as JsonObject;
    }
    return null;
  } catch {
    return null;
  }
};

const scheduleNotificationClose = (type: 'success' | 'error' | 'report', callback: () => void, customDelay?: number) => {
  const delays: Record<string, number> = {
    success: 2000,
    error: 3500,
    report: 5500
  };
  const delay = customDelay || delays[type] || 3000;
  setTimeout(callback, delay);
};

const countLeafNodes = (obj: JsonValue): number => {
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) return 0;
  const o = obj as JsonObject;
  let count = 0;
  
  for (const key of Object.keys(o)) {
    const value = o[key];
    if (typeof value === 'string') {
      count++;
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      count += countLeafNodes(value);
    }
  }
  return count;
};

const detectUnsupportedTypes = (obj: JsonValue, path = ""): string[] => {
  const issues: string[] = [];
  
  if (Array.isArray(obj)) {
    return [path || "(根数组)"];
  }
  
  if (typeof obj === 'object' && obj !== null) {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (Array.isArray(value)) {
        issues.push(`${currentPath} (数组)`);
      } else if (typeof value === 'number') {
        issues.push(`${currentPath} (数字)`);
      } else if (typeof value === 'boolean') {
        issues.push(`${currentPath} (布尔值)`);
      } else if (typeof value === 'object' && value !== null) {
        issues.push(...detectUnsupportedTypes(value, currentPath));
      }
    }
  }
  
  return issues;
};

// --- 🎨 Components ---

const CoverageIndicator = ({ total, missing }: { total: number; missing: number }) => {
  const current = Math.max(0, total - missing);
  // Fix: If total is 0, percentage should be 0, not 100.
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  // 当 source 为空时，显示灰色占位符
  const isEmpty = total === 0;
  
  let colorClass = "text-slate-400"; // Default grey for 0%
  let strokeClass = "stroke-slate-300";
  
  if (total > 0) {
      if (percentage < 50) {
        colorClass = "text-red-500";
        strokeClass = "stroke-red-500";
      } else if (percentage < 100) {
        colorClass = "text-amber-500";
        strokeClass = "stroke-amber-500";
      } else {
        colorClass = "text-emerald-500";
        strokeClass = "stroke-emerald-500";
      }
  }

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full group cursor-help relative">
      <div className="relative w-9 h-9 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="18" cy="18" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" className="text-slate-200" />
          <circle cx="18" cy="18" r={radius} stroke="currentColor" strokeWidth="3" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" className={`${strokeClass} transition-all duration-1000 ease-out`} />
        </svg>
        <div className={`absolute text-[10px] font-bold ${colorClass}`}>{isEmpty ? "—" : `${percentage}%`}</div>
      </div>
      <div className="flex flex-col leading-none">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Coverage</span>
        <span className={`text-sm font-bold ${colorClass}`}>{isEmpty ? "—" : <>{current} <span className="text-slate-300">/</span> {total}</>}</span>
      </div>
    </div>
  );
};

const JsonDiffViewer = ({ 
  source, 
  target, 
  lastTranslatedKeys, 
  depth = 0, 
  path = '' 
}: { 
  source: JsonValue; 
  target?: JsonValue; 
  lastTranslatedKeys: Set<string>; 
  depth?: number; 
  path?: string 
}) => {
  if (typeof source !== 'object' || source === null || Array.isArray(source)) return null;
  const sourceObj = source as JsonObject;

  return (
    <div style={{ paddingLeft: depth === 0 ? 0 : 20 }} className="font-mono text-sm">
      {depth === 0 && <span className="text-slate-400">{'{'}</span>}
      {Object.keys(sourceObj).map((key) => {
        const currentPath = path ? `${path}.${key}` : key;
        const sourceValue = sourceObj[key];
        const targetObj = (typeof target === 'object' && target !== null && !Array.isArray(target)) ? (target as JsonObject) : null;
        const targetValue = targetObj ? targetObj[key] : undefined;
        const isObject = typeof sourceValue === 'object' && sourceValue !== null && !Array.isArray(sourceValue);
        
        const isArray = Array.isArray(sourceValue);
        const isNumber = typeof sourceValue === 'number';
        const isBoolean = typeof sourceValue === 'boolean';
        const isUnsupported = isArray || isNumber || isBoolean;
        
        if (isUnsupported) {
          return (
            <div key={key} className="relative opacity-50 bg-slate-50/50 -mx-4 px-4 py-0.5 rounded-sm hover:opacity-100 transition-opacity">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center cursor-help">
                      <span className="mr-1 text-slate-400">&quot;{key}&quot;:</span>
                      <span className="text-slate-400 italic text-xs font-semibold">
                        [{isArray ? '数组' : isNumber ? '数字' : '布尔值'}]
                      </span>
                      <span className="ml-2 text-[9px] bg-slate-300 text-slate-700 px-1.5 rounded font-bold uppercase tracking-wider">
                        不支持
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="bg-slate-900 text-white border-slate-700">
                    MVP 仅支持字符串翻译。数组、数字、布尔值会被忽略。
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          );
        }
        
        const existsInTarget = targetObj && Object.prototype.hasOwnProperty.call(targetObj, key);
        const isMissing = !existsInTarget;
        const isNew = lastTranslatedKeys.has(currentPath);
        
        let bgClass = "";
        let statusBadge = null;
        let valueDisplay = null;

        if (isMissing) {
          bgClass = "bg-red-50/80 border-l-2 border-red-400";
          statusBadge = <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold uppercase tracking-wider">Missing</span>;
          if (!isObject) valueDisplay = <span className="text-red-300 italic">&quot;{String(sourceValue)}&quot;</span>;
        } else if (isNew) {
          bgClass = "bg-emerald-50/80 border-l-2 border-emerald-400";
          statusBadge = <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-600 px-1 rounded font-bold uppercase tracking-wider">New</span>;
          if (!isObject) valueDisplay = <span className="text-indigo-600">&quot;{String(targetValue)}&quot;</span>;
        } else {
            if (!isObject) valueDisplay = <span className="text-indigo-600">&quot;{String(targetValue)}&quot;</span>;
        }

        return (
          <div key={key} className={`relative group ${bgClass} -mx-4 px-4 py-0.5 rounded-sm transition-colors`}>
             <div className="flex items-center">
                <span className={`mr-1 ${isMissing ? 'text-red-400' : 'text-slate-500'}`}>&quot;{key}&quot;:</span>
                {isObject ? <span className="text-slate-400">{'{'}</span> : <>{valueDisplay}<span className="text-slate-400">,</span>{statusBadge}</>}
             </div>
            {isObject && (
              <>
                <JsonDiffViewer 
                  source={sourceValue}
                  target={targetValue}
                  lastTranslatedKeys={lastTranslatedKeys}
                  depth={depth + 1}
                  path={currentPath}
                />
                <div className="text-slate-400">{'}'},</div>
              </>
            )}
          </div>
        );
      })}
      {depth === 0 && <span className="text-slate-400">{'}'}</span>}
    </div>
  );
};

// --- 🔵 Main App Component ---

export default function App() {
  const [sourceCode, setSourceCode] = useState("");

  const [targetCode, setTargetCode] = useState(
    JSON.stringify({}, null, 2)
  );

  const [missingKeys, setMissingKeys] = useState({});
  const [targetLang, setTargetLang] = useState("zh");
  
  // Notification state with proper typing
  interface NotificationState {
    type: 'report' | 'success' | 'error';
    stats?: { synced: number; modified: number; time: string; model: string };
    msg?: string;
    action?: { label: string; onClick: () => void };
  }
  const [notification, setNotification] = useState<NotificationState | null>(null); 
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  const [viewMode, setViewMode] = useState("diff");
  const [lastTranslatedKeys, setLastTranslatedKeys] = useState<Set<string>>(new Set());
  const [isDraggingSource, setIsDraggingSource] = useState(false);
  const [isDraggingTarget, setIsDraggingTarget] = useState(false);
  const sourceFileInputRef = useRef<HTMLInputElement>(null);
  const targetFileInputRef = useRef<HTMLInputElement>(null);
  const prevTargetLangRef = useRef(targetLang);
  const prevTargetCodeRef = useRef(targetCode);
  const undoLangRef = useRef(targetLang); // 额外的 ref 保存撤销时的旧语言
  const isUndoingRef = useRef(false); // 标志：是否在撤销操作中

  const { translate, isTranslating, error: translateError } = useTranslate();

  // 📁 文件上传处理
  const handleFileUpload = useCallback((file: File, target: 'source' | 'target') => {
    // 1. 文件类型检查
    if (!file.name.endsWith('.json')) {
      setNotification({ type: "error", msg: "Only .json files are supported" });
      scheduleNotificationClose('error', () => setNotification(null));
      return;
    }
    
    // 2. 文件大小限制（1MB）
    if (file.size > 1024 * 1024) {
      setNotification({ type: "error", msg: "File too large. Max 1MB." });
      scheduleNotificationClose('error', () => setNotification(null));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      
      // 3. JSON 解析校验
      try {
        JSON.parse(content);
      } catch {
        setNotification({ type: "error", msg: "Invalid JSON format in file" });
        scheduleNotificationClose('error', () => setNotification(null));
        return;
      }
      
      // 4. 自动格式化并填入
      const formatted = formatJson(content);
      const finalContent = formatted.success ? formatted.result : content;
      
      if (target === 'source') {
        setSourceCode(finalContent);
      } else {
        setTargetCode(finalContent);
      }
      
      setNotification({ type: "success", msg: `✨ ${file.name} loaded${formatted.success ? ' & formatted' : ''}` });
      scheduleNotificationClose('success', () => setNotification(null));
    };
    
    reader.onerror = () => {
      setNotification({ type: "error", msg: "Failed to read file" });
      scheduleNotificationClose('error', () => setNotification(null));
    };
    
    reader.readAsText(file);
  }, []);

  // 拖拽事件处理
  const handleDragOver = useCallback((e: React.DragEvent, target: 'source' | 'target') => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
    if (target === 'source') {
      setIsDraggingSource(true);
    } else {
      setIsDraggingTarget(true);
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, target: 'source' | 'target') => {
    e.preventDefault();
    e.stopPropagation();
    if (target === 'source') {
      setIsDraggingSource(true);
    } else {
      setIsDraggingTarget(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, target: 'source' | 'target') => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as Node).contains(related)) {
      return;
    }
    if (target === 'source') {
      setIsDraggingSource(false);
    } else {
      setIsDraggingTarget(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, target: 'source' | 'target') => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSource(false);
    setIsDraggingTarget(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0], target);
    }
  }, [handleFileUpload]);

  const analyzeJson = useCallback(() => {
    const sourceObj = parseJson(sourceCode);
    const targetObj = parseJson(targetCode);
    
    if (sourceObj && targetObj) {
      const unsupported = detectUnsupportedTypes(sourceObj);
      if (unsupported.length > 0) {
        setNotification({
          type: 'error',
          msg: `⚠️ 检测到 ${unsupported.length} 个不支持翻译的类型（数组/数字/布尔值），这些会被忽略。`
        });
        const timer = setTimeout(() => {
          setNotification(null);
        }, 5500);
      }
      
      // 继续计算 missingKeys，即使有不支持的类型
      const { missingKeys } = findMissingTranslations(sourceObj, targetObj);
      setMissingKeys(missingKeys);
    } else {
      setMissingKeys({});
    }
  }, [sourceCode, targetCode]);

  const totalSourceKeys = useMemo(() => {
    const sourceObj = parseJson(sourceCode);
    return sourceObj ? countLeafNodes(sourceObj) : 0;
  }, [sourceCode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      analyzeJson();
    }, 800);
    return () => clearTimeout(timer);
  }, [analyzeJson]);

  // Detect language change and auto-clear target with undo option
  useEffect(() => {
    // Check if language actually changed
    if (prevTargetLangRef.current !== targetLang) {
      // 如果在撤销中，直接恢复 ref 并返回，不要清空 targetCode
      if (isUndoingRef.current) {
        isUndoingRef.current = false;
        prevTargetLangRef.current = targetLang;
        return;
      }

      const targetObj = parseJson(targetCode);
      const hasTranslations = targetObj && Object.keys(targetObj).length > 0;

      if (hasTranslations) {
        // Save current targetCode and language for undo, then clear it
        undoLangRef.current = prevTargetLangRef.current; // 保存旧的语言
        prevTargetCodeRef.current = targetCode;
        
        setTimeout(() => {
          const emptyTarget = JSON.stringify({}, null, 2);
          setTargetCode(emptyTarget);
          // Don't manually clear missingKeys - let analyzeJson recalculate it
          
          setNotification({
            type: "success",
            msg: "✨ 目标 JSON 已清空，准备新语言翻译",
            action: {
              label: "撤销",
              onClick: () => {
                isUndoingRef.current = true; // 标记撤销操作
                setTargetLang(undoLangRef.current); // 恢复旧的语言
                setTargetCode(prevTargetCodeRef.current);
                setNotification(null);
              }
            }
          });
          scheduleNotificationClose('success', () => setNotification(null), 8000);
        }, 0);
      } else {
        // No translations, just ensure clean state
        setTimeout(() => {
          setTargetCode(JSON.stringify({}, null, 2));
          // Don't manually clear missingKeys - let analyzeJson recalculate it
        }, 0);
      }
      
      // Update ref to current language
      prevTargetLangRef.current = targetLang;
    }
  }, [targetLang, targetCode]);

  const handleTranslate = async () => {
    if (Object.keys(missingKeys).length === 0) return;
    
    const sourceObj = parseJson(sourceCode);
    const targetObj = parseJson(targetCode);
    
    if (!sourceObj || !targetObj) {
      setNotification({ type: "error", msg: "Invalid JSON format" });
      scheduleNotificationClose('error', () => setNotification(null));
      return;
    }

    const startTime = performance.now();
    const missingKeyCount = Object.keys(missingKeys).length;
    
    try {
      const sourceLangName = "English";
      const targetLangObj = LANGUAGES.find(lang => lang.code === targetLang);
      const targetLangName = targetLangObj?.name || targetLang;
      
      const result = await translate({
        sourceJson: sourceObj,
        targetJson: targetObj,
        sourceLang: sourceLangName,
        targetLang: targetLangName,
        context: undefined
      });

      const duration = ((performance.now() - startTime) / 1000).toFixed(2);

      if (result.success && result.mergedJson) {
        setTargetCode(JSON.stringify(result.mergedJson, null, 2));
        
        const stats = {
          synced: result.translatedCount,
          modified: 0,
          time: duration,
          model: 'Llama 3.3 70B'
        };
        
        const newTranslatedKeys = new Set(Object.keys(missingKeys));
        setLastTranslatedKeys(newTranslatedKeys);
        
        setNotification({ 
            type: "report", 
            stats
        });
        setMissingKeys({});
        setViewMode("diff");
        
        scheduleNotificationClose('report', () => setNotification(null));
      } else {
        setNotification({ type: "error", msg: translateError || "Translation failed" });
        scheduleNotificationClose('error', () => setNotification(null));
      }
    } catch (error) {
      setNotification({ type: "error", msg: translateError || "Error translating" });
      scheduleNotificationClose('error', () => setNotification(null));
    }
  };

  const copyToClipboard = () => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = targetCode;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setNotification({ type: "success", msg: "Copied to clipboard!" });
        scheduleNotificationClose('success', () => setNotification(null));
      } else {
        setNotification({ type: "error", msg: "Failed to copy" });
        scheduleNotificationClose('error', () => setNotification(null));
      }
    } catch {
      setNotification({ type: "error", msg: "Failed to copy" });
      scheduleNotificationClose('error', () => setNotification(null));
    }
  };

  const handleResetTarget = () => {
    const targetObj = parseJson(targetCode);
    const hasTranslations = targetObj && Object.keys(targetObj).length > 0;

    if (hasTranslations) {
      setResetDialogOpen(true);
      return;
    }

    // No translations, safe to reset
    setTargetCode(JSON.stringify({}, null, 2));
    setMissingKeys({});
    setNotification({ type: "success", msg: "✅ 目标 JSON 已清空，准备开始新语言翻译" });
    scheduleNotificationClose('success', () => setNotification(null));
  };

  const handleDirectReset = () => {
    setResetDialogOpen(false);
    setTargetCode(JSON.stringify({}, null, 2));
    setMissingKeys({});
    setNotification({ type: "success", msg: "✅ 目标 JSON 已清空，准备开始新语言翻译" });
    scheduleNotificationClose('success', () => setNotification(null));
  };

  const handleSaveAndReset = () => {
    handleDownload();
    setResetDialogOpen(false);
    setTimeout(() => {
      setTargetCode(JSON.stringify({}, null, 2));
      setMissingKeys({});
      setNotification({ type: "success", msg: "✅ 已保存并清空目标 JSON，准备开始新语言翻译" });
      scheduleNotificationClose('success', () => setNotification(null));
    }, 500);
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([targetCode], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `translations-${targetLang}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      setNotification({ type: "success", msg: `Downloaded: ${a.download}` });
      scheduleNotificationClose('success', () => setNotification(null));
    } catch {
      setNotification({ type: "error", msg: "Failed to download file" });
      scheduleNotificationClose('error', () => setNotification(null));
    }
  };

  const missingCount = Object.keys(missingKeys).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-sm">
            <Languages className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-tight">i18n Auto-Translator</h1>
            {/* ✨ Value Proposition: 直击痛点的人话 */}
            <p className="text-xs text-slate-500 font-medium">Stop copy-pasting. Auto-translate missing keys instantly.</p>
          </div>
          <a
            href="https://github.com/zhaochengzcq/Json18n"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 bg-slate-900 hover:bg-slate-700 rounded-md transition-colors"
            title="View on GitHub"
          >
            <Github className="w-4 h-4 text-white" />
          </a>
        </div>
        
        <div className="flex items-center gap-6">
           <CoverageIndicator total={totalSourceKeys} missing={missingCount} />
           <div className="hidden md:flex items-center gap-2 text-sm bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <span className="text-slate-500 hidden sm:inline">Target:</span>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="bg-transparent font-semibold text-indigo-600 outline-none cursor-pointer text-sm"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row">
        {/* Source Column */}
        <div className="flex-1 flex flex-col border-r border-slate-200 bg-white min-h-[400px]">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-700">Source (Reference)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {/* Upload 按钮 */}
                <button
                  onClick={() => sourceFileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                  title="Upload JSON file"
                >
                  <Upload className="w-3 h-3" />
                  <span className="hidden sm:inline">Upload</span>
                </button>
                <input
                  ref={sourceFileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleFileUpload(file, 'source');
                      e.target.value = ''; // Reset to allow re-upload same file
                    }
                  }}
                />
                {/* Format 按钮 */}
                <button
                  onClick={() => {
                    const result = formatJson(sourceCode);
                    if (result.success) {
                      setSourceCode(result.result);
                      setNotification({ type: "success", msg: "✨ JSON formatted" });
                      scheduleNotificationClose('success', () => setNotification(null));
                    } else {
                      setNotification({ type: "error", msg: `Format error: ${result.error}` });
                      scheduleNotificationClose('error', () => setNotification(null));
                    }
                  }}
                  disabled={!sourceCode.trim()}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Format JSON (Ctrl+Shift+F)"
                >
                  <Wand2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Format</span>
                </button>
              </div>
              <span className="hidden sm:inline text-[11px] text-slate-400">Tip: Upload or drag & drop JSON</span>
            </div>
          </div>
          {/* Monaco Editor - Source */}
          <div 
            className={`flex-1 relative transition-all min-h-[300px] ${isDraggingSource ? 'ring-2 ring-indigo-400 ring-inset bg-indigo-50/30' : ''}`}
            onDragEnterCapture={(e) => handleDragEnter(e, 'source')}
            onDragOverCapture={(e) => handleDragOver(e, 'source')}
            onDragLeaveCapture={(e) => handleDragLeave(e, 'source')}
            onDropCapture={(e) => handleDrop(e, 'source')}
          >
            {isDraggingSource && (
              <div className="absolute inset-0 flex items-center justify-center bg-indigo-50/80 z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-2 text-indigo-600">
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-medium">Drop JSON file here</span>
                </div>
              </div>
            )}
            {!sourceCode ? (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-white/80">
                <div className="space-y-3 text-left max-w-sm">
                  <div className="flex items-start gap-3 group">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold shrink-0 mt-0.5">1</span>
                    <div>
                      <p className="text-sm font-medium text-slate-700">Upload or paste source JSON</p>
                      <p className="text-xs text-slate-400">Drag & drop supported · e.g. en.json</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold shrink-0 mt-0.5">2</span>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Paste target JSON <span className="text-slate-400 font-normal">(optional)</span></p>
                      <p className="text-xs text-slate-400">Right panel → Edit mode</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold shrink-0 mt-0.5">3</span>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Click <Zap className="w-3.5 h-3.5 inline text-indigo-500" /> to translate</p>
                      <p className="text-xs text-slate-400">Only missing keys</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold shrink-0 mt-0.5">4</span>
                    <div>
                      <p className="text-sm font-medium text-slate-500">Copy or download result</p>
                      <p className="text-xs text-slate-400">Ready to use</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          <JsonEditor
            key={sourceCode ? 'source-has-content' : 'source-empty'}
            value={sourceCode}
            onChange={setSourceCode}
          />
          </div>
        </div>

        {/* Center Actions - sticky 保持在视窗中 */}
        <div className="w-full md:w-16 shrink-0 bg-slate-50 border-r border-slate-200 flex md:flex-col items-center justify-center gap-4 p-2 z-20 group relative md:sticky md:top-20 md:self-start md:h-fit">
          <div className="hidden md:block w-px h-8 bg-slate-200"></div>
          
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={handleTranslate}
              disabled={missingCount === 0 || isTranslating}
              className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 relative ${
                missingCount > 0
                  ? "bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-110"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              } ${isTranslating ? "animate-pulse cursor-wait" : ""}`}
            >
              {isTranslating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Zap className="w-6 h-6 fill-current" />}
              {!isTranslating && (
                <span className={`absolute -top-2 -right-2 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-50 ${
                  missingCount > 0 
                    ? "bg-amber-500" 
                    : "bg-slate-400"
                }`}>
                    {missingCount > 9 ? '9+' : missingCount}
                </span>
              )}
            </button>
            {/* ✨ Main Button Label: SYNC → Translate */}
            <span className={`text-[9px] font-bold tracking-tight uppercase ${missingCount > 0 ? "text-indigo-600" : "text-slate-300"}`}>Translate</span>

            {/* Reset Target Button */}
            <button
              onClick={handleResetTarget}
              className="mt-2 w-10 h-10 rounded-lg flex items-center justify-center bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-700 transition-all shadow-sm group/reset relative"
              title="清空目标 JSON，开始新语言翻译"
            >
              <RotateCcw className="w-5 h-5" />
              <div className="hidden group-hover/reset:block absolute left-full ml-2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50">
                清空目标
              </div>
            </button>
            <span className="text-[9px] text-slate-500 font-medium">重置</span>

            {/* ✨ Visible Safe Mode Badge */}
            <div className="mt-3 flex flex-col items-center cursor-help bg-emerald-50 border border-emerald-100 px-1 py-1.5 rounded-md hover:bg-emerald-100 transition-colors">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="text-[8px] text-emerald-700 font-bold hidden md:block leading-none mt-1 text-center">SAFE<br/>MODE</span>
            </div>
          </div>

          <div className="hidden md:block w-px h-8 bg-slate-200"></div>

          {/* Contextual Tooltip */}
          <div className="hidden md:block absolute left-full top-1/2 -translate-y-1/2 ml-3 w-64 bg-slate-900 text-white p-3 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50">
             <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-bold text-emerald-400 mb-0.5">Safe Sync Active</h4>
                    <p className="text-[10px] text-slate-300 leading-snug">Only missing keys will be translated. Existing values are <strong className="text-white">never overwritten</strong>.</p>
                </div>
             </div>
             <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45"></div>
          </div>
        </div>

        {/* Target Column */}
        <div className="flex-1 flex flex-col bg-white min-h-0">
          <div className="shrink-0 px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              {viewMode === 'diff' ? <Eye className="w-4 h-4 text-indigo-500" /> : <Code2 className="w-4 h-4 text-slate-400" />}
              <span className="text-sm font-semibold text-slate-700">
                {viewMode === 'diff' ? 'Diff Preview' : 'Raw JSON'}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Upload 按钮 - 仅在 Edit 模式显示 */}
              {viewMode === 'code' && (
                <>
                  <button
                    onClick={() => targetFileInputRef.current?.click()}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all"
                    title="Upload JSON file"
                  >
                    <Upload className="w-3 h-3" />
                    <span className="hidden sm:inline">Upload</span>
                  </button>
                  <input
                    ref={targetFileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(file, 'target');
                        e.target.value = '';
                      }
                    }}
                  />
                </>
              )}
              {/* Format 按钮 - 仅在 Edit 模式显示 */}
              {viewMode === 'code' && (
                <button
                  onClick={() => {
                    const result = formatJson(targetCode);
                    if (result.success) {
                      setTargetCode(result.result);
                      setNotification({ type: "success", msg: "✨ JSON formatted" });
                      scheduleNotificationClose('success', () => setNotification(null));
                    } else {
                      setNotification({ type: "error", msg: `Format error: ${result.error}` });
                      scheduleNotificationClose('error', () => setNotification(null));
                    }
                  }}
                  disabled={!targetCode.trim() || targetCode === '{}'}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Format JSON"
                >
                  <Wand2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Format</span>
                </button>
              )}
              {viewMode === 'code' && (
                <span className="hidden md:inline text-[11px] text-slate-400">Tip: Drag & drop JSON</span>
              )}
              
              <div className="flex bg-white rounded-lg border border-slate-200 p-0.5">
                  <button onClick={() => setViewMode('diff')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${viewMode === 'diff' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                      <Eye className="w-3 h-3" /> Diff
                  </button>
                  <button onClick={() => setViewMode('code')} className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${viewMode === 'code' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`}>
                      <Edit3 className="w-3 h-3" /> Edit
                  </button>
              </div>
            </div>
          </div>

          {/* Target 内容区 */}
          <div 
            className={`flex-1 relative group bg-white transition-all min-h-[300px] ${isDraggingTarget && viewMode === 'code' ? 'ring-2 ring-indigo-400 ring-inset bg-indigo-50/30' : ''}`}
            onDragEnterCapture={(e) => {
              if (viewMode !== 'code') return;
              handleDragEnter(e, 'target');
            }}
            onDragOverCapture={(e) => {
              if (viewMode !== 'code') return;
              handleDragOver(e, 'target');
            }}
            onDragLeaveCapture={(e) => {
              if (viewMode !== 'code') return;
              handleDragLeave(e, 'target');
            }}
            onDropCapture={(e) => {
              if (viewMode !== 'code') return;
              handleDrop(e, 'target');
            }}
          >
            {isDraggingTarget && viewMode === 'code' && (
              <div className="absolute inset-0 flex items-center justify-center bg-indigo-50/80 z-20 pointer-events-none">
                <div className="flex flex-col items-center gap-2 text-indigo-600">
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-medium">Drop JSON file here</span>
                </div>
              </div>
            )}
            {viewMode === 'diff' ? (
                <div className="p-4 min-h-full">
                    <JsonDiffViewer source={parseJson(sourceCode) || {}} target={parseJson(targetCode)} lastTranslatedKeys={lastTranslatedKeys} />
                </div>
            ) : (
                <JsonEditor
                  key={targetCode === '{}' || targetCode === '{\n}' || !targetCode.trim() ? 'target-empty' : 'target-has-content'}
                  value={targetCode}
                  onChange={setTargetCode}
                />
            )}

              <div className="absolute bottom-6 right-6 flex gap-2 z-10">
                <button onClick={copyToClipboard} className="bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 shadow-sm px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all">
                  <Copy className="w-4 h-4" /> Copy JSON
                </button>
                <button onClick={handleDownload} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all">
                  <Download className="w-4 h-4" /> Download
                </button>
              </div>
          </div>
        </div>
      </main>

      {/* --- 🛠️ Engineering Grade Notification --- */}
      {notification && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 rounded-lg shadow-2xl flex items-center animate-in fade-in slide-in-from-bottom-4 duration-300 z-50 overflow-hidden ${
            notification.type === "report" ? "bg-slate-900 text-white border border-slate-700" : 
            notification.type === "success" ? "bg-emerald-600 text-white" : 
            notification.type === "error" && notification.msg?.includes("⚠️") ? "bg-amber-600 text-white" : "bg-red-600 text-white"
        }`}>
          
          {notification.type === "report" ? (
             <div className="flex flex-col min-w-[280px]">
                {/* Header Row */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
                    <div className="flex items-center gap-2 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 fill-emerald-400/20" />
                        <span className="font-bold text-sm">Sync Complete</span>
                    </div>
                    <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                
                {/* Metrics Grid */}
                <div className="px-4 py-3 space-y-2">
                    {notification.stats && (
                      <>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-sm font-medium">Synced <span className="text-white font-bold">{notification.stats.synced}</span> missing keys</span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-slate-400">
                            <Lock className="w-3.5 h-3.5" />
                            <span className="text-xs">0 existing keys modified</span>
                        </div>

                        <div className="pt-2 mt-1 border-t border-slate-700/50 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {notification.stats.time}s
                            </div>
                            <div className="flex items-center gap-1.5">
                                <BrainCircuit className="w-3 h-3" />
                                {notification.stats.model}
                            </div>
                        </div>
                      </>
                    )}
                </div>
             </div>
          ) : (
            // Fallback for simple errors/success
             <div className="px-4 py-3 flex items-center gap-3">
                {notification.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="font-medium text-sm">{notification.msg}</span>
                {notification.action && (
                  <button
                    onClick={() => {
                      notification.action!.onClick();
                    }}
                    className="ml-auto px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-md text-xs font-semibold transition-colors whitespace-nowrap"
                  >
                    {notification.action.label}
                  </button>
                )}
                <button onClick={() => setNotification(null)} className="ml-2 hover:bg-white/20 rounded-full p-0.5"><X className="w-3 h-3" /></button>
             </div>
          )}
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">清空目标 JSON？</DialogTitle>
            <DialogDescription>
              您有未保存的翻译内容。请选择下方选项继续：
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-slate-600 mb-3">
              💾 <span className="font-medium">保存后重置</span>：将当前翻译下载为文件，然后清空目标 JSON
            </p>
            <p className="text-sm text-slate-600">
              🗑️ <span className="font-medium">直接重置</span>：不保存，直接清空目标 JSON
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2 flex-row">
            <button
              onClick={() => setResetDialogOpen(false)}
              className="flex-1 px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDirectReset}
              className="flex-1 px-4 py-2 text-sm font-medium border border-red-200 bg-red-50 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
            >
              直接重置
            </button>
            <button
              onClick={handleSaveAndReset}
              className="flex-1 px-4 py-2 text-sm font-medium border border-indigo-200 bg-indigo-50 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors"
            >
              保存后重置
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 px-6 py-2 text-[10px] text-slate-400 flex justify-between uppercase tracking-wider font-semibold">
        <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            Safe Mode: Existing values are never overwritten
        </span>
        <span className="flex items-center gap-2">
          {missingCount > 0 ? `${missingCount} Keys Missing` : "All Synced"}
          <span className={`w-2 h-2 rounded-full ${missingCount > 0 ? "bg-amber-400" : "bg-emerald-400"}`}></span>
        </span>
      </footer>
    </div>
  );
}