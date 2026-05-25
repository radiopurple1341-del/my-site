# CLAUDE.md

## プロジェクト概要

音楽を中心に、映画・漫画・小説・評論など自分がふれてきたコンテンツを横断的に蓄積する個人アーカイブサイト。

主な役割：
1. note・FC2ブログの過去記事および本サイト独自記事をまとめるアーカイブ
2. リピーターが毎日覗きたくなる個人サイト（2000年代前半の個人サイト的体験）

検索流入を主目的とする記事は note 側に置く方針。このサイトはリピーター向けの導線・更新履歴・日記・過去記事回遊を担う。
※ただしこの方針は現在も検討中のため、判断が必要な場面では確認すること。

---

## 技術スタック

- **フレームワーク**: Astro（静的サイト出力）
- **コンテンツ管理**: Astro Content Collections
- **ホスティング**: Cloudflare Pages
- **CMS連携**: 未導入（Notion連携を将来検討中）

### ホスティング制約
Cloudflare Pages にデプロイするため、サーバーサイド機能が必要な場合は **Cloudflare Workers / KV / D1** を使う前提で実装する。Node.js 固有のランタイムや他クラウド前提の実装は避ける。

---

## フォルダ構成

```
src/
  content/
    diary/                    # 一行日記（1日1ファイル、1〜3行、テキストのみ）
    article/                  # 全記事格納（外部・内部問わず）
      external/               # 自分の外部記事（note・FC2ブログへのリンク）
        ex_*.md
      external_curated/       # 他サイト記事のキュレーション
        ex_*.md               # プレフィックスは同じex_を使用
      main_*.md               # 本サイト独自記事
```

**`external_curated/` の性質**：
- `article.id.startsWith('external_curated/')` で他サイト記事と判定（フィールド追加不要）
- ランダム・アーカイブに表示対象とし、カード背景色で他サイト記事と可視化する
- アーカイブページでは初期非表示・トグルボタンで表示切替

---

## ファイル命名規則

| プレフィックス | 意味 |
|---|---|
| `ex_` | 外部記事（externalUrlあり） |
| `main_` | 本サイト独自記事 |

外部記事のファイル名フォーマット：
```
ex_(pubDate)_(category)_rev_(slug).md
```
例: `ex_20240925_music_rev_sonic-youth-6-washing-machine.md`

**注意**: `ex_` ファイルはスクリプト生成物のため、手動編集は原則しない。

---

## フロントマター仕様

```yaml
title: ""
pubDate: YYYY-MM-DD
description: ""        # 本サイト独自の紹介文。外部記事は空欄でよい
category: ""           # 大分類（下記参照）
tags: []               # 横断導線用。#なしで記述
featured: true         # トップのランダム表示対象かどうか
workYear:              # 作品・アルバム等の発表年
workMonth:             # 発表月（任意）
externalUrl: ""        # 元記事URL。本サイト記事は空欄
thumbnail: ""          # サムネ画像（未実装・今後追加予定）
```

### カテゴリ一覧
- 音楽
- 映画
- 漫画
- ゲーム
- 書籍
- 文章

### workYear / workMonth について
「1990年代の音楽・映画・漫画を横断して見る」のような年代別回遊を将来的に実現するための重要フィールド。月が不明な場合は空欄でよい。

### タグについて
カテゴリは大分類、タグは横断導線として使う。タグ表記のブレはアーカイブ性を壊すため、既存タグと表記を合わせること。

---

## 日付表示の標準

サイト上の日付表示は **`YY.MM.DD`** 形式に統一する。

例: `26.05.13`（2026年5月13日）

- フロントマターの `pubDate` は `YYYY-MM-DD` で保存（変更なし）
- 画面に出力する際は2桁年・ゼロ埋め形式に変換する
- 既存ページで `YYYY.MM.DD` になっている箇所は順次修正する

---

## 設計原則

1. **構造優先・デザイン後回し** - まず機能と導線を固める
2. **「今」と「過去」の両方への入口** - トップは最新更新 + 過去アーカイブへの入口
3. **リピーター体験優先** - 偶然の記事との出会い、ランダム表示、タグ・カテゴリ回遊

---

## 未決定事項（作業前に確認すること）

- noteとの役割分担（SEO記事をnoteに置くか本サイトにも置くか）
- Notion / CMS連携の導入可否
- article フォルダをexternal・internalで分けるかどうか
- サムネイル取得・表示の実装方法
- アクセスカウンター・コメント機能の実装方法（静的サイト + Cloudflare 環境での実現手段を要検討）

---

## レスポンシブ設計

| ブレークポイント | 対象 |
|---|---|
| `≤500px` | index.astro：カルーセルスワイプ・最近追加した作品グリッド |
| `≤800px` | works.astro：グリッドカードレイアウト・フィルター行調整 / Tracklist：クレジット列非表示（#・曲名・時間のみ） |
| `≥1270px` | index.astro：2カラム（main 800px + side 400px）、site-wrap を 1264px に拡張 |

---

## 日記ファイルの pubDate

`src/content/diary/` のファイル名は `YYYY-MM-DD.md` 形式。`pubDate` はファイル名から自動取得するため、frontmatter への記載不要。

---

## Astro 既知の挙動

- **Astro v5以降、コンテンツ設定ファイルは `src/content.config.ts`（プロジェクトルート直下の src/）**
  - `src/content/config.ts` は旧パスで Astro v6 では無視される
  - スキーマ変更は必ず `src/content.config.ts` に対して行うこと

- **MDXファイル内のimportパスは `src/content/article/works/` からの相対パス**
  - `src/components/` へのimportは `../../../components/` と書く（3階層上）

- **Content CollectionsのファイルIDは小文字に変換される**
  - `InoueYousui-Negative.md` → ID は `inoueyousui-negative`
  - `workId` など他コレクションと突き合わせるフィールドは必ず小文字で書くこと
  - work ファイルのファイル名は最初から小文字で作ること

- **Tabs コンポーネント（`src/components/Tabs.astro`）の上タブ下ライン消去**
  - 上タブ行（`.tab-labels:not(.tab-labels-bottom)`）には `position: relative; z-index: 1; margin-bottom: -1.5px` が必要
  - これにより `.tab-labels` が `.tab-content`（`z-index: 0`）より前面に出て、SVG polygon の fill が `border-top` を塗り潰す
  - **この3プロパティを削除・変更すると上タブの下ライン消去が壊れる**
  - 下タブ行は `::after { top: -2px }` で `border-bottom` を隠す別の仕組み（こちらは触らない）

### work ファイルの命名規則
```
{アーティスト名}-{作品名}.md
```
- アーティスト名内のスペースは `_` で区切る
- アーティスト名と作品名の間は `-` で区切る
- すべて小文字

例: `inoue_yousui-negative.md`、`sonic_youth-washing_machine.md`

---

## work 記事の新規作成フロー

### 概要
`_article_meta.csv` にメタ情報を記入して渡すと、Claude が MDX ファイルを生成する。
トラックリストと感想文はユーザーが手書きで追記する。

### CSV テンプレート
`src/content/article/works/_article_meta.csv`

| フィールド | 説明 |
|---|---|
| `fileName` | 生成する `.mdx` のファイル名（拡張子なし）。`workId` と一致させる |
| `title` | 記事タイトル（例: `井上陽水『Negative』`） |
| `pubDate` | 初回掲載日（`YYYY-MM-DD`） |
| `category` | カテゴリ（音楽 / 映画 / 漫画 / ゲーム / 書籍 / その他） |
| `tags` | スペース区切りで複数可（例: `井上陽水 フォーク`） |
| `artwork` | 空欄なら `/artworks/{fileName}.jpg` を自動補完 |
| `rating` | 0〜100 の数値（100点満点） |
| `spotify_url` | 空欄可 |
| `youtube_url` | 空欄可 |
| `artist` | アーティスト名（work ファイル生成に必須） |
| `workYear` | 発表年（work ファイル生成に必須） |
| `workMonth` | 発表月（任意） |
| `workType` | 種別ラベル（任意、例: アルバム / 映画） |

### Claude がやること
1. `_article_meta.csv` の値を読み取る
2. `_template.mdx` をベースに `{fileName}.mdx` を `src/content/article/works/` に生成
3. `workId` は `fileName` と同じ値を使用
4. `artwork` が空欄なら `/artworks/{fileName}.jpg` を補完
5. トラックリスト・感想文はプレースホルダーのまま残す
   - 共通部分：フルトラックリスト（mark なし）
   - 各タブ内：`simple` モードのトラックリスト（#・曲名・mark のみ）
6. `artist` と `workYear` が埋まっていれば `src/content/work_index/{fileName}.md` も同時生成

### ユーザーがやること（生成後）
- トラックリストを手書きで追記
- 各タブの感想文を手書きで追記
- `public/artworks/` にアートワーク画像を配置

---

## 作業リスト

今後取り組む作業は `docs/TODO.md` に記録している。

---

## してはいけないこと

- `ex_` ファイルを直接編集する（スクリプトで再生成するため）
- フロントマターのフィールド名を勝手に変更・追加する
- 未決定事項を独自判断で実装する（必ず確認する）
