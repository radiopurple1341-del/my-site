整理済みZIP

残したもの:
- URL取得スクリプト
- 記事生成スクリプト
- URL一覧
- CSV出力
- output/生成記事

旧版・テスト・重複・文字化けファイルは除外しています。

---

## ツール構成

  URLnote-get.py      ← ① note から URL を全件収集
  note_urls.txt       ← ①の出力先
  urls.txt            ← ② 処理したいURLを書く（スクリプトへのインプット）
  article-create.py   ← ③ .md ファイルを生成するメインスクリプト
  output/             ← ③の出力先（自動作成）

---

## 使用手順

### STEP 1（任意）: note の URL を一括取得する

新しい記事を追加したタイミングなどに実行。

  cd note一括URL取得
  python URLnote-get.py

→ note_urls.txt に自分の note 記事URLが全件出力される。

---

### STEP 2: 処理したい URL を urls.txt に書く

urls.txt（ex-creator/ 直下）を編集して、.md にしたい URL を1行1つで書く。
note_urls.txt から必要なものをコピーしてもよい。

  https://note.com/okyouth2head/n/xxxxx
  https://note.com/okyouth2head/n/yyyyy

---

### STEP 3: スクリプトを実行

ex-creator/ ディレクトリから実行すること（相対パスで urls.txt を読むため）。

  cd D:\1_my-site\automate-wotk\ex-creator
  python article-create.py

→ output/ フォルダに .md ファイルが生成される。

---

### STEP 4: 生成ファイルを確認して配置

output/ の中身を確認し、問題なければ src/content/article/external/ にコピーする。

---

## 注意点

- workYear は自動で記事公開年が入るが、正しくは作品の発表年なので手動修正が必要
- tags は空のまま生成される（手動で追加）

## 入力ファイル

output.csv に URL・カテゴリ・出力先を記入してからスクリプトを実行する。
詳細は output.csv 内のコメントを参照。
