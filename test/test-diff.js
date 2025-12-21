"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// test-diff.ts
var json_diff_1 = require("../lib/utils/json-diff");
var source = {
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
var target = {
    app: {
        title: "你好世界",
        // desc 缺失
        menu: {
            home: "首页"
        }
    }
};
console.log("🔍 Running Diff...");
var result = (0, json_diff_1.findMissingTranslations)(source, target);
console.log("✅ Missing Keys (Expect: app.desc, app.menu.about, errors.404):");
console.log(JSON.stringify(result.missingKeys, null, 2));
// 预期输出：
// {
//   "app.desc": "This is a strictly typed tool.",
//   "app.menu.about": "About Us",
//   "errors.404": "Page not found"
// }
