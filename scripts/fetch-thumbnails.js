/**
 * fetch-thumbnails.js
 *
 * external/ 配下の ex_*.md を読み、externalUrl の og:image を取得して
 * thumbnail フィールドに書き込む。
 *
 * 使い方: node scripts/fetch-thumbnails.js
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = join(__dirname, '../src/content/article/external');
const DELAY_MS = 1000; // 連続アクセスを避けるための待機時間

async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; site-builder)' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    // property="og:image" content="..." の両パターンに対応
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const files = readdirSync(ARTICLES_DIR).filter(f => f.startsWith('ex_') && f.endsWith('.md'));
console.log(`対象ファイル: ${files.length}件\n`);

for (const file of files) {
  const filePath = join(ARTICLES_DIR, file);
  const content = readFileSync(filePath, 'utf-8');

  // thumbnail フィールドがすでに値を持っていればスキップ
  const thumbnailMatch = content.match(/^thumbnail:\s*["']?([^"'\n]+)["']?\s*$/m);
  if (thumbnailMatch?.[1]?.trim()) {
    console.log(`skip  ${file}`);
    continue;
  }

  // externalUrl を取得
  const urlMatch = content.match(/^externalUrl:\s*["']([^"']+)["']/m);
  if (!urlMatch) {
    console.log(`skip  ${file} (externalUrl なし)`);
    continue;
  }

  const url = urlMatch[1];
  process.stdout.write(`fetch ${file}\n      → ${url}\n`);

  const ogImage = await fetchOgImage(url);

  if (!ogImage) {
    console.log('      → og:image 取得できず\n');
    continue;
  }

  console.log(`      → ${ogImage}`);

  // thumbnail フィールドの挿入 or 更新
  let newContent;
  if (/^thumbnail:/m.test(content)) {
    // 空で存在している場合 → 上書き
    newContent = content.replace(
      /^thumbnail:\s*["']?[^"'\n]*["']?\s*$/m,
      `thumbnail: "${ogImage}"`
    );
  } else {
    // フィールド自体がない → externalUrl の直後に追加
    newContent = content.replace(
      /^(externalUrl:.*)/m,
      `$1\nthumbnail: "${ogImage}"`
    );
  }

  writeFileSync(filePath, newContent);
  console.log('      → 書き込み完了\n');

  await sleep(DELAY_MS);
}

console.log('完了');
