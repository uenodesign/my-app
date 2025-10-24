// tools/make-token-hash.js
// 使い方:
//   node tools/make-token-hash.js "<app_token の値>"

const crypto = require("crypto");

const token = process.argv[2] || "";
if (!token) {
  console.error('使い方: node tools/make-token-hash.js "<app_tokenの値>"');
  process.exit(1);
}

const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

console.log("=== app_token ===");
console.log(token);
console.log("\n=== Firestore ドキュメントID (tokenHash) ===");
console.log(tokenHash);
console.log("\n=== Firestore で開く場所 ===");
console.log("コレクション: credits_tokens");
console.log(`ドキュメントID: ${tokenHash}`);
