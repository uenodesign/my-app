// tools/make-keyid.js
// 使い方: node tools/make-keyid.js "AIza...（Google APIキー）"
const crypto = require("crypto");

function normalizeApiKey(raw) {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  // 途中の空白（半角/全角/改行/タブ）をすべて除去
  s = s.replace(/[\s\u3000]+/g, "");
  // 貼り付け時の前後の引用符だけ除去
  s = s.replace(/^["']+|["']+$/g, "");
  // ★ 小文字化しない！（サーバと一致させる）
  return s;
}

function makeKeyId(apiKey) {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

const input = process.argv[2];
if (!input) {
  console.error('エラー: APIキーを引数で渡してください\n例) node tools/make-keyid.js "AIza..."');
  process.exit(1);
}

const normalized = normalizeApiKey(input);
if (!normalized) {
  console.error("エラー: 正規化後のAPIキーが空です。入力値をご確認ください。");
  process.exit(1);
}

const keyId = makeKeyId(normalized);

console.log("=== 入力APIキー（正規化後） ===");
console.log(normalized);
console.log("\n=== Firestore ドキュメントID (keyId) ===");
console.log(keyId);
console.log("\n=== Firestore で開く場所 ===");
console.log("コレクション: credits_keys");
console.log(`ドキュメントID: ${keyId}`);
console.log("\nメモ:");
console.log("- サーバの normalize と完全一致（空白/全角空白/引用符のみ除去、非小文字化）。");
console.log("- ドキュメントが見つからない場合、まだ作成されていない可能性（購入/無料付与/検索時に作成）。");
