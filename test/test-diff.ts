// test-diff.ts
import { findMissingTranslations } from '../lib/utils/json-diff';

const source = {
  app: {
    title: "Hello World",
    desc: "This is a strictly typed tool.",
    menu: {
      home: "Home",
      about: "About Us" // Target 缺失这个
    }
  },
  errors: {
    404: "Page not found" // Target 整个 errors 节点都缺失
  }
};

const target = {
  app: {
    title: "你好世界",
    // desc 缺失
    menu: {
      home: "首页"
    }
  }
};

console.log("🔍 Running Diff...");
const result = findMissingTranslations(source, target);

console.log("✅ Missing Keys (Expect: app.desc, app.menu.about, errors.404):");
console.log(JSON.stringify(result.missingKeys, null, 2));

// 预期输出：
// {
//   "app.desc": "This is a strictly typed tool.",
//   "app.menu.about": "About Us",
//   "errors.404": "Page not found"
// }