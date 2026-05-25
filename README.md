# my-site

個人サイト。Astro 製。

## セットアップ

```bash
npm install
npm run dev
```

## コンテンツの更新方法

### 日記を書く

`src/content/diary/` に `YYYY-MM-DD.md` というファイルを作る。

```md
---
pubDate: 2026-03-29
---
今日のできごとを1〜3行で書く。
```

### 記事を追加する

`src/content/article/` に Markdown ファイルを作る。

**外部記事（noteなど）の場合：**
```md
---
title: "記事タイトル"
pubDate: 2026-03-29
description: "独自の紹介文（100字程度）"
category: 音楽  # 音楽 / 映画 / 漫画 / 小説 / その他
tags: [タグ1, タグ2]
externalUrl: "https://note.com/..."
featured: true  # トップのランダム表示に出したいとき
---
```

**本サイト独自記事の場合：**
```md
---
title: "記事タイトル"
pubDate: 2026-03-29
description: "記事の概要"
category: 音楽
tags: [タグ1]
thumbnail: "/images/hoge.jpg"  # public/images/ に置いた画像
featured: false
---

本文をここに書く。
```

## サイト情報の変更

`src/consts.ts` でサイト名、URL、SNSアカウントを設定する。

## デプロイ（Vercel）

1. GitHub にプッシュ
2. Vercel でリポジトリを連携
3. Framework Preset: Astro を選択
4. デプロイ完了

以降は `main` ブランチへのプッシュで自動デプロイされる。
