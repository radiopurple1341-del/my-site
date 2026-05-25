# work_index / article/works の関係

## 概要

作品ひとつに対して、最大2つのファイルが存在する。

| フォルダ | 役割 | 必須 |
|---|---|---|
| `src/content/work_index/` | 作品リスト（/works）に載せるためのメタデータ | ○ |
| `src/content/article/works/` | 感想・トラックリストを含むフル記事 | △（記事がある場合のみ） |

---

## ファイル名の規則

両フォルダで**同じベース名**を使う。

```
work_index/inoue_yousui-negative.md
article/works/inoue_yousui-negative.mdx
```

命名規則：`{アーティスト名}-{作品名}`
- スペースは `_` で区切る
- アーティスト名と作品名の間は `-`
- すべて小文字

---

## 紐づけの仕組み

`article/works/` の記事フロントマターに `workId` フィールドを持つ。
値は `work_index/` のファイル名（拡張子なし）と一致させる。

```yaml
# article/works/inoue_yousui-negative.mdx
workId: "inoue_yousui-negative"
```

```yaml
# work_index/inoue_yousui-negative.md
title: "Negative"
artist: "井上陽水"
```

`/works` ページがこの `workId` で突き合わせ、記事があれば作品名をリンクにする。

---

## work_index/ のテンプレート

```yaml
---
title: "作品名"          # 作品単体の名称（例: Negative）
artist: "アーティスト名"  # アーティスト / 監督 / 著者
category: 音楽            # 音楽 / 映画 / 漫画 / ゲーム / 書籍 / その他
workYear: 1986            # 発表年
workMonth:                # 発表月（任意）
workType: "アルバム"      # 種別ラベル（任意）
---
```

---

## article/works/ のテンプレート

```mdx
---
title: "アーティスト名『作品名』"
pubDate: 2000-01-01
description: ""
category: 音楽
tags: [アーティスト名]
featured: false
workId: "artist_name-work_title"
artwork: "/artworks/artist_name-work_title.jpg"
rating: 0
---

import Tabs from '../../../components/Tabs.astro';
import Tab from '../../../components/Tab.astro';
import Tracklist from '../../../components/Tracklist.astro';
import TrackLegend from '../../../components/TrackLegend.astro';
import YouTube from '../../../components/YouTube.astro';
import Spotify from '../../../components/Spotify.astro';
import Expand from '../../../components/Expand.astro';
import URL from '../../../components/URL.astro';
import B from '../../../components/B.astro';
import R from '../../../components/R.astro';
import RB from '../../../components/RB.astro';
import U from '../../../components/U.astro';

---

共通情報をここに書く。（リリース背景、作品概要など）

<Tabs>
  <Tab label="YYYY/MM/DD v1" active>

## トラックリスト
<TrackLegend />
<Tracklist
  defaultLyric="作詞者名"
  defaultMusic="作曲者名"
  defaultArrange="編曲者名"
  defaultProducer="プロデューサー名"
  tracks={[
    { n: 1, title: "曲名", mark: "", lyric: "", music: "", arrange: "", producer: "", time: "0:00" },
    { n: 2, title: "曲名", mark: "", lyric: "", music: "", arrange: "", producer: "", time: "0:00" },
    { n: 3, title: "曲名", mark: "", lyric: "", music: "", arrange: "", producer: "", time: "0:00", note: "補足情報" },
  ]}
/>

---

総評：

はじめて聴いたときの感想をここに書く。

  </Tab>
  <Tab label="YYYY/MM/DD v2">

## トラックリスト
<TrackLegend />
<Tracklist
  defaultLyric="作詞者名"
  defaultMusic="作曲者名"
  defaultArrange="編曲者名"
  defaultProducer="プロデューサー名"
  tracks={[
    { n: 1, title: "曲名", mark: "", lyric: "", music: "", arrange: "", producer: "", time: "0:00" },
    { n: 2, title: "曲名", mark: "", lyric: "", music: "", arrange: "", producer: "", time: "0:00" },
    { n: 3, title: "曲名", mark: "", lyric: "", music: "", arrange: "", producer: "", time: "0:00" },
  ]}
/>

---

総評：

聴き返してみて気づいたことをここに書く。

  </Tab>
</Tabs>

---

<Spotify url="https://open.spotify.com/album/ALBUM_ID" />
```

---

## Tracklistのmarkフィールド

曲名の装飾に使う。

| 値 | 表示 |
|---|---|
| `""` | 黒字（デフォルト） |
| `"★"` | 太字 |
| `"★★"` | 赤字 |
| `"★★★"` | 赤太字 |
| `"-u"` | 下線（シングル／リードトラック） |
| `"★-u"` | 太字 + 下線 |
| `"★★-u"` | 赤字 + 下線 |
| `"★★★-u"` | 赤太字 + 下線 |

---

## 生成パターン

### 作品リストにだけ載せたい（記事なし）

→ `work_index/` にのみファイルを作る。

### 記事も書く

→ `work_index/` と `article/works/` の両方に同じベース名でファイルを作る。
→ `article/works/` の `workId` に `work_index/` のファイル名を記入する。
