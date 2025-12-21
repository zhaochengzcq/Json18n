// 🟢 基础类型定义，确保类型安全
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonObject
  | JsonArray;
export interface JsonObject {
  [key: string]: JsonValue;
}
export type JsonArray = JsonValue[];

/**
 * 可翻译的值类型
 * MVP 策略：只支持字符串翻译
 */
export type TranslatableValue = string;

/**
 * 缺失键值对的映射表
 * Key: 扁平化的路径 (例如 "auth.login.button")
 * Value: 需要翻译的字符串值
 */
export type MissingKeysMap = Record<string, TranslatableValue>;

/**
 * 核心 Diff 结果接口
 * missingKeys: 需要翻译的键值对 (Path -> TranslatableValue)
 * obsoleteKeys: 目标文件中存在但源文件中没有的键 (用于清理或警告)
 */
export interface DiffResult {
  missingKeys: MissingKeysMap;
  obsoleteKeys: string[];
}

/**
 * 递归比较 Source 和 Target，找出缺失的 Key
 * @param source 参考标准 (Source of Truth)
 * @param target 现有翻译 (Existing Translation)
 * @param prefix 当前路径前缀 (用于递归)
 */
export function findMissingTranslations(
  source: JsonObject,
  target: JsonObject,
  prefix = ""
): DiffResult {
  const missingKeys: MissingKeysMap = {};
  const obsoleteKeys: string[] = [];

  // 1. 遍历 Source，寻找 Missing Keys
  // 使用 Object.keys() 避免原型链污染
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];
    const currentPath = prefix ? `${prefix}.${key}` : key;

    // 情况 A: Target 中完全不存在该 Key 或为 null -> 标记为缺失
    // 注意：null 和 undefined 都视为缺失值，需要翻译
    if (targetValue === undefined || targetValue === null) {
      // MVP 策略：字符串直接翻译，嵌套对象中的字符串叶子节点展开后翻译
      if (typeof sourceValue === "string") {
        missingKeys[currentPath] = sourceValue;
      } else if (
        typeof sourceValue === "object" &&
        sourceValue !== null &&
        !Array.isArray(sourceValue)
      ) {
        // 嵌套对象：递归展开所有字符串叶子节点
        const flattened = flattenObject(sourceValue, currentPath);
        Object.assign(missingKeys, flattened);
      }
      // 数组和其他类型在 MVP 阶段直接忽略
      continue;
    }

    // 情况 B: 两者都是对象 -> 递归深入比较
    // 注意：MVP 阶段不支持数组翻译（都排除）
    if (
      typeof sourceValue === "object" &&
      sourceValue !== null &&
      !Array.isArray(sourceValue) &&
      typeof targetValue === "object" &&
      targetValue !== null &&
      !Array.isArray(targetValue)
    ) {
      const nestedDiff = findMissingTranslations(
        sourceValue as JsonObject,
        targetValue as JsonObject,
        currentPath
      );
      Object.assign(missingKeys, nestedDiff.missingKeys);
      // 这里的 obsoleteKeys 我们暂不向上合并，除非你想做深度清理
      continue;
    }

    // 情况 C: 类型不匹配 (例如 Source 是对象，Target 变成了字符串)
    // MVP 策略：string 需要翻译，嵌套对象中的字符串叶子节点展开后翻译
    if (typeof sourceValue !== typeof targetValue) {
      if (typeof sourceValue === "string") {
        // Source 是字符串但 Target 不是字符串 -> 需要翻译
        missingKeys[currentPath] = sourceValue;
      } else if (
        typeof sourceValue === "object" &&
        sourceValue !== null &&
        !Array.isArray(sourceValue)
      ) {
        // 嵌套对象：递归展开所有字符串叶子节点
        const flattened = flattenObject(sourceValue, currentPath);
        Object.assign(missingKeys, flattened);
      }
      // 数组和其他类型不匹配的情况在 MVP 阶段直接忽略
    }
  }

  // 2. (可选) 遍历 Target，寻找 Obsolete Keys (用户删除了源文案)
  // MVP 阶段可以先注释掉这段，为了性能
  /*
  for (const key in target) {
    if (source[key] === undefined) {
      obsoleteKeys.push(prefix ? `${prefix}.${key}` : key);
    }
  }
  */

  return { missingKeys, obsoleteKeys };
}

/**
 * 辅助函数：将嵌套对象展开为 Path -> TranslatableValue
 *
 * MVP 策略：
 * - ✅ 支持嵌套对象的字符串叶子节点展开
 * - ❌ 不支持数组翻译
 *
 * 例如：
 *   Input:  { "buttons": { "save": "Save", "cancel": "Cancel" } }
 *   Prefix: "settings"
 *   Output: { "settings.buttons.save": "Save", "settings.buttons.cancel": "Cancel" }
 */
function flattenObject(obj: JsonValue, prefix: string): MissingKeysMap {
  /**
   * ⚠️ MVP LIMITATIONS:
   * - Arrays are intentionally not supported
   * - Only string leaf nodes are considered translatable
   */

  const result: MissingKeysMap = {};

  if (typeof obj === "string") {
    // 基础情况：当前值是字符串
    result[prefix] = obj;
    return result;
  }

  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
    // 不处理：非对象、null、数组
    return result;
  }

  // 递归处理对象中的每个属性
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newPath = prefix ? `${prefix}.${key}` : key;

    if (typeof value === "string") {
      // 字符串叶子节点：直接添加
      result[newPath] = value;
    } else if (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      // 嵌套对象：继续递归展开
      const nestedFlat = flattenObject(value, newPath);
      Object.assign(result, nestedFlat);
    }
    // 其他类型（数组、数字、布尔值等）直接忽略
  }

  return result;
}
