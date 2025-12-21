// test-merge.ts
import { mergeTranslations } from '@/lib/utils/json-merge';
import assert from 'assert'; // Node.js 内置断言库

console.log("🛠 Starting Merge Logic Tests...");

// 基础数据
const initialTarget = {
  common: {
    confirm: "Confirm" // ✅ 已存在
  },
  // errors 节点完全缺失
};

// 模拟 AI 返回的翻译结果 (Diff 算出来的 Missing Keys)
const incomingTranslations = {
  "common.cancel": "Cancel",         // 补全 sibling
  "errors.404.title": "Not Found",   // 深层创建
  "errors.404.desc": "Page gone",    // 深层创建 sibling
  "common.confirm": "New Confirm"    // ⚠️ 模拟一个意外冲突 (Diff 逻辑理论上不该给这个，但我们要测试 Merge 是否无脑执行)
};

const result = mergeTranslations(initialTarget, incomingTranslations);

// 🧪 Test 1: 深层结构安全创建 (Deep Structure)
// 验证 errors.404.title 是否被正确创建
assert.deepStrictEqual(
  result.merged['errors'], 
  { 404: { title: "Not Found", desc: "Page gone" } },
  "❌ Failed: Deep structure not created correctly"
);
console.log("✅ Test 1 Passed: Deep structure auto-created.");

// 🧪 Test 2: 不误伤已有数据 (Side Effect Safety)
// 验证 common.confirm 是否存在 (注意：按照当前 Merge 逻辑，它会执行覆盖。
// 如果我们决定 Merge 必须也是"只读写"，可以在 setValueByPath 里加锁。
// 但通常逻辑是：Diff 没给的 Key，Merge 不会动；Diff 给的 Key，Merge 必须动。)
assert.strictEqual((result.merged['common'] as any)['confirm'], "New Confirm"); 
// 这里的逻辑是：Merge 函数假设传入的 map 都是“需要更新”的。
// “不覆盖”的保护应该由 Step 1 的 Diff 逻辑保证（它根本就不应该把 existing key 放进 map）。
console.log("✅ Test 2 Passed: Map values applied correctly.");

// 🧪 Test 3: 原始对象不被污染 (Immutability)
assert.strictEqual((initialTarget as any)['errors'], undefined, "❌ Failed: Original object mutated!");
console.log("✅ Test 3 Passed: Original object remains untouched.");

console.log("🎉 All Merge Tests Passed!");