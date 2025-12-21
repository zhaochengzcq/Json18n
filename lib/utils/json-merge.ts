// json-merge.ts
import { JsonObject, MissingKeysMap, TranslatableValue } from "./json-diff";

/**
 * Merge 过程中的错误/警告
 */
export interface MergeError {
  path: string;
  reason: "array_not_supported" | "overwrite_blocked" | "invalid_path";
  value?: TranslatableValue;
}

/**
 * Merge 结果
 */
export interface MergeResult {
  /** 合并后的 JSON 对象 */
  merged: JsonObject;
  /** 因为安全模式或其他原因被跳过的 key */
  errors: MergeError[];
}

interface MergeOptions {
  /**
   * 是否允许覆盖已存在的值？
   * 默认为 false (安全模式)。只有在明确知道 key 是新的时候才写入。
   * 对于 MVP，Diff 算出的 missingKeys 本就不该包含已有的，
   * 但这层校验是最后一道防线。
   */
  overwrite?: boolean;
}

/**
 * 核心 Merge 函数 (带安全选项)
 */
export function mergeTranslations(
  targetJson: JsonObject,
  translatedMap: MissingKeysMap,
  options: MergeOptions = { overwrite: false } // 🔒 默认开启安全保护
): MergeResult {
  // 优化 6: 智能拷贝策略
  // 只在必要时进行深拷贝，避免大对象的 JSON.parse/stringify 开销
  // 对于 i18n JSON（通常结构简单），这个优化效果明显
  // let result: JsonObject;

  // const hasErrors = Object.keys(translatedMap).some(path => {
  //   // 快速检查是否存在问题的路径（数组索引或特殊字符）
  //   return /^\d+$/.test(path.split('.')[0]) || path.includes('\0');
  // });

  // if (hasErrors || !options.overwrite) {
  //   // 如果有风险路径或使用 safe mode，进行完整深拷贝
  //   result = JSON.parse(JSON.stringify(targetJson));
  // } else {
  //   // 优化路径：直接修改（仅在确认安全时）
  //   // ⚠️ 注意：这会修改原始对象，仅在调用者同意时使用
  //   result = targetJson as JsonObject;
  // }
  // MVP：始终深拷贝，保证纯函数
  const result = JSON.parse(JSON.stringify(targetJson));
  const errors: MergeError[] = [];

  for (const [path, value] of Object.entries(translatedMap)) {
    const pathErrors = setValueByPath(result, path, value, options);
    errors.push(...pathErrors);
  }

  return { merged: result, errors };
}

/**
 * 辅助函数：安全写入
 *
 * 返回在合并过程中遇到的错误（不会抛出异常，而是记录）
 *
 * 问题 7 处理：验证路径中的特殊字符
 * - 如果 key 包含 "."，会导致路径歧义（无法区分是一个 key 还是嵌套）
 * - 目前 json-diff 产生的路径都是通过 "prefix.key" 组装的
 * - 建议在 json-diff 中对 key 进行转义
 */
function setValueByPath(
  obj: JsonObject,
  path: string,
  value: TranslatableValue,
  options: MergeOptions
): MergeError[] {
  const errors: MergeError[] = [];

  // 参数验证（问题 8：缺少参数验证）
  if (!path || typeof path !== "string") {
    errors.push({
      path: String(path),
      reason: "invalid_path",
      value,
    });
    return errors;
  }

  // 警告：路径中包含特殊字符可能导致歧义
  // 如果源 JSON 中的 key 本身包含 "."，应该在 json-diff 阶段进行转义
  if (path.includes("..") || path.startsWith(".") || path.endsWith(".")) {
    errors.push({
      path,
      reason: "invalid_path",
      value,
    });
    return errors;
  }

  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const isLast = i === keys.length - 1;

    // 检测数组路径（不支持）
    if (/^\d+$/.test(key)) {
      errors.push({
        path,
        reason: "array_not_supported",
        value,
      });
      return errors;
    }

    if (isLast) {
      // 🛡️ 安全阀：如果禁止覆盖，且当前值已存在（非 undefined），则跳过
      if (!options.overwrite && current[key] !== undefined) {
        errors.push({
          path,
          reason: "overwrite_blocked",
          value,
        });
        return errors;
      }
      current[key] = value;
    } else {
      // 处理中间路径的对象
      // ⚠️ 修复 null 值处理：null 虽然 typeof 为 'object'，但不能作为对象容器
      if (
        current[key] === null ||
        typeof current[key] !== "object" ||
        Array.isArray(current[key])
      ) {
        current[key] = {};
      }
      current = current[key] as JsonObject;
    }
  }

  return errors;
}
