"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMissingTranslations = findMissingTranslations;
/**
 * 递归比较 Source 和 Target，找出缺失的 Key
 * @param source 参考标准 (Source of Truth)
 * @param target 现有翻译 (Existing Translation)
 * @param prefix 当前路径前缀 (用于递归)
 */
function findMissingTranslations(source, target, prefix) {
    if (prefix === void 0) { prefix = ""; }
    var missingKeys = {};
    var obsoleteKeys = [];
    // 1. 遍历 Source，寻找 Missing Keys
    for (var key in source) {
        var sourceValue = source[key];
        var targetValue = target[key];
        var currentPath = prefix ? "".concat(prefix, ".").concat(key) : key;
        // 情况 A: Target 中完全不存在该 Key -> 标记为缺失
        if (targetValue === undefined) {
            if (typeof sourceValue === "string") {
                missingKeys[currentPath] = sourceValue;
            }
            else if (typeof sourceValue === "object" && sourceValue !== null) {
                // 如果是对象/数组，需要递归展开，不能直接把对象丢给翻译
                var flattened = flattenObject(sourceValue, currentPath);
                Object.assign(missingKeys, flattened);
            }
            continue;
        }
        // 情况 B: 两者都是对象 -> 递归深入比较
        if (typeof sourceValue === "object" &&
            sourceValue !== null &&
            !Array.isArray(sourceValue) &&
            typeof targetValue === "object" &&
            targetValue !== null &&
            !Array.isArray(targetValue)) {
            var nestedDiff = findMissingTranslations(sourceValue, targetValue, currentPath);
            missingKeys = __assign(__assign({}, missingKeys), nestedDiff.missingKeys);
            // 这里的 obsoleteKeys 我们暂不向上合并，除非你想做深度清理
            continue;
        }
        // 情况 C: 类型不匹配 (例如 Source 是对象，Target 变成了字符串) -> 视为缺失，以 Source 为准
        if (typeof sourceValue !== typeof targetValue) {
            if (typeof sourceValue === "string") {
                missingKeys[currentPath] = sourceValue;
            }
            else if (typeof sourceValue === "object" && sourceValue !== null) {
                Object.assign(missingKeys, flattenObject(sourceValue, currentPath));
            }
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
    return { missingKeys: missingKeys, obsoleteKeys: obsoleteKeys };
}
/**
 * 辅助函数：将嵌套对象拍平为 Path -> String
 * 用于当 Target 缺失整个父节点时，提取所有子节点文本
 */
function flattenObject(obj, prefix) {
    var result = {};
    if (typeof obj === "string") {
        result[prefix] = obj;
        return result;
    }
    if (typeof obj !== "object" || obj === null) {
        return result;
    }
    if (Array.isArray(obj)) {
        obj.forEach(function (value, index) {
            var newKey = "".concat(prefix, ".").concat(index);
            if (typeof value === "object") {
                result = __assign(__assign({}, result), flattenObject(value, newKey));
            }
            else if (typeof value === "string") {
                result[newKey] = value;
            }
        });
    }
    else {
        // It is a JsonObject
        for (var key in obj) {
            var value = obj[key];
            var newKey = "".concat(prefix, ".").concat(key);
            if (typeof value === "object") {
                result = __assign(__assign({}, result), flattenObject(value, newKey));
            }
            else if (typeof value === "string") {
                result[newKey] = value;
            }
        }
    }
    return result;
}
