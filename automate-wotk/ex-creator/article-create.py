import requests
import re
import csv
import os
import html
import shutil
from datetime import datetime

try:
    import pykakasi
    _kks = pykakasi.kakasi()
    def _to_romaji(text):
        return " ".join(item["hepburn"] for item in _kks.convert(text))
except ImportError:
    print("[WARN] pykakasi not installed. Japanese titles will use URL-based slug.")
    def _to_romaji(text):
        return text

# =========================
# 設定
# =========================

INPUT_FILE = "output.csv"
RUN_TIMESTAMP = datetime.now().strftime("%Y%m%d_%H%M%S")
OUTPUT_BASE = f"output-{RUN_TIMESTAMP}"

HEADERS = {
    "User-Agent": "Mozilla/5.0"
}

CATEGORY_SLUG = {
    "音楽": "music",
    "映画": "movie",
    "漫画": "manga",
    "ゲーム": "game",
    "書籍": "book",
    "文章": "essay",
}

OUTPUT_DIR_MAP = {
    "1": "external",
    "2": "external_curated",
}

# =========================
# ユーティリティ
# =========================

def decode_unicode_escapes(s):
    return re.sub(r'\\u([0-9a-fA-F]{4})', lambda m: chr(int(m.group(1), 16)), s)

def slugify(text, max_len=60):
    text = html.unescape(text)
    text = decode_unicode_escapes(text)
    text = _to_romaji(text)
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    text = text.strip()
    text = re.sub(r'[\s]+', '-', text)
    return text[:max_len].rstrip('-')

def build_tags_yaml(tags_str):
    if not tags_str.strip():
        return "[]"
    tags = [t.strip() for t in tags_str.split() if t.strip()]
    return "[" + ", ".join(tags) + "]"

# =========================
# ページ取得
# =========================

def fetch_page_data(url, log):
    try:
        res = requests.get(url, headers=HEADERS, timeout=10)
        log.append(f"  [HTTP] status={res.status_code}")
        page = res.text

        # タイトル: note JSON-LD → OGP → <title>タグ の順でフォールバック
        title_match = re.search(r'"name":"(.*?)","headline"', page)
        og_title_match = re.search(r'<meta[^>]*property="og:title"[^>]*content="(.*?)"', page)
        title_tag_match = re.search(r'<title>(.*?)(?:｜.*?)?</title>', page)
        if title_match:
            title = html.unescape(decode_unicode_escapes(title_match.group(1)))
            log.append(f"  [title] JSON-LD: {title[:60]}")
        elif og_title_match:
            title = html.unescape(decode_unicode_escapes(og_title_match.group(1)))
            log.append(f"  [title] OGP: {title[:60]}")
        elif title_tag_match:
            title = html.unescape(decode_unicode_escapes(title_tag_match.group(1).strip()))
            log.append(f"  [title] <title>タグ: {title[:60]}")
        else:
            title = None
            log.append(f"  [title] 取得失敗")
            log.append(f"  [HTML先頭] {page[:300]}")

        # 公開日: publishAt（note）→ datePublished（標準）→ <time datetime>
        date_match = re.search(r'"publishAt":"(.*?)"', page)
        date_match2 = re.search(r'"datePublished":"(.*?)"', page) if not date_match else None
        date_match3 = re.search(r'<time[^>]*datetime="(\d{4}-\d{2}-\d{2})', page) if not date_match and not date_match2 else None
        if date_match:
            pub_date = date_match.group(1)[:10]
            log.append(f"  [pubDate] publishAt: {pub_date}")
        elif date_match2:
            pub_date = date_match2.group(1)[:10]
            log.append(f"  [pubDate] datePublished: {pub_date}")
        elif date_match3:
            pub_date = date_match3.group(1)
            log.append(f"  [pubDate] <time>タグ: {pub_date}")
        else:
            pub_date = None
            log.append(f"  [pubDate] 取得失敗")

        # サムネイル
        thumbnail_match = re.search(r'<meta[^>]*property="og:image"[^>]*content="(.*?)"', page)
        if thumbnail_match:
            thumbnail = thumbnail_match.group(1)
            log.append(f"  [thumbnail] 取得成功")
        else:
            thumbnail = ""
            log.append(f"  [thumbnail] 取得失敗")

        # サイト名
        site_match = re.search(r'<meta[^>]*property="og:site_name"[^>]*content="(.*?)"', page)
        site_name = site_match.group(1) if site_match else ""
        if site_name.startswith("note"):
            site_name = "note"
        log.append(f"  [siteName] {site_name or '取得失敗'}")

        # 著者
        author = ""
        if og_title_match and "｜" in og_title_match.group(1):
            candidate = og_title_match.group(1).split("｜", 1)[1].strip()
            if len(candidate) <= 30:
                author = candidate
        if not author:
            author_match = re.search(r'<meta[^>]*name="author"[^>]*content="(.*?)"', page)
            author = author_match.group(1) if author_match else ""
        log.append(f"  [author] {author or '取得失敗'}")

        return title, pub_date, thumbnail, site_name, author

    except Exception as e:
        log.append(f"  [ERROR] 接続失敗: {e}")
        return None, None, "", "", ""

# =========================
# ファイル生成
# =========================

def generate_md(row, log):
    url = row.get("url", "").strip()
    category = row.get("category", "").strip()
    output_key = row.get("output先", "1").strip()
    tags_str = row.get("tags", "").strip()
    description = row.get("description", "").strip()
    csv_pub_date = row.get("pubDate", "").strip()
    if csv_pub_date and not re.match(r'^\d{4}-\d{2}-\d{2}$', csv_pub_date):
        log.append(f"  [WARN] pubDate の形式が不正のため無視: {csv_pub_date[:30]}")
        csv_pub_date = ""
    csv_author = row.get("author", "").strip()

    if not url or not category:
        msg = f"[SKIP] url または category が空"
        print(msg); log.append(msg)
        return {"url": url, "status": "SKIP", "filename": "", "title": "", "pubDate": "", "thumbnail": "", "siteName": "", "author": ""}

    if category not in CATEGORY_SLUG:
        msg = f"[SKIP] 無効な category '{category}'"
        print(msg); log.append(msg)
        return {"url": url, "status": "SKIP", "filename": "", "title": "", "pubDate": "", "thumbnail": "", "siteName": "", "author": ""}

    log.append(f"[URL] {url}")
    print(f"[URL] {url}")

    output_subdir = OUTPUT_DIR_MAP.get(output_key, "external")
    output_dir = os.path.join(OUTPUT_BASE, output_subdir)
    os.makedirs(output_dir, exist_ok=True)

    title, pub_date, thumbnail, site_name, author = fetch_page_data(url, log)
    if csv_author:
        author = csv_author
    if csv_pub_date:
        pub_date = csv_pub_date
    elif not pub_date:
        pub_date = datetime.today().strftime("%Y-%m-%d")
    if not title:
        title = "失敗"

    pub_date_compact = pub_date.replace("-", "")
    category_slug = CATEGORY_SLUG[category]
    slug = slugify(title)
    if len(slug) < 3:
        last_segment = url.rstrip("/").split("/")[-1]
        last_segment = re.sub(r'\.\w+$', '', last_segment)
        slug = last_segment if last_segment else "article"

    filename = f"ex_{pub_date_compact}_{category_slug}_rev_{slug}.md"
    tags_yaml = build_tags_yaml(tags_str)

    content = f"""---
title: "{title}"
pubDate: {pub_date}
description: "{description}"
category: {category}
tags: {tags_yaml}
externalUrl: "{url}"
thumbnail: "{thumbnail}"
featured: true
author: "{author}"
siteName: "{site_name}"
---
"""

    filepath = os.path.join(output_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

    msg = f"[OK] {output_subdir}/{filename}"
    print(msg); log.append(msg)

    return {
        "url": url,
        "status": "OK",
        "filename": filename,
        "title": title,
        "pubDate": pub_date,
        "thumbnail": "○" if thumbnail else "×",
        "siteName": site_name,
        "author": author,
    }

# =========================
# メイン処理
# =========================

def main():
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        lines = [line for line in f if not line.startswith("#")]

    reader = csv.DictReader(lines, restval="")
    rows = [row for row in reader if row.get("url", "").strip()]

    if not rows:
        print("処理対象の行がありません（URLが空）")
        return

    os.makedirs(OUTPUT_BASE, exist_ok=True)

    log = [f"実行日時: {RUN_TIMESTAMP}", "-" * 60]
    results = []

    try:
        for row in rows:
            try:
                result = generate_md(row, log)
                results.append(result)
            except Exception as e:
                url = row.get("url", "")
                msg = f"[ERROR] 予期せぬエラー: {e}"
                print(msg); log.append(msg)
                results.append({"url": url, "status": "ERROR", "filename": "", "title": "", "pubDate": "", "thumbnail": "", "siteName": "", "author": ""})
            log.append("")
    finally:
        log.append("-" * 60)
        log.append(f"完了: {len(results)}件処理")
        print("\n完了")

        log_path = os.path.join(OUTPUT_BASE, "log.txt")
        with open(log_path, "w", encoding="utf-8") as f:
            f.write("\n".join(log) + "\n")

        csv_path = os.path.join(OUTPUT_BASE, "results.csv")
        fields = ["status", "filename", "title", "pubDate", "thumbnail", "siteName", "author", "url"]
        with open(csv_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(results)

        shutil.copy(INPUT_FILE, os.path.join(OUTPUT_BASE, "input.csv"))

        print(f"Output: {OUTPUT_BASE}/")
        print(f"Log:    {log_path}")
        print(f"CSV:    {csv_path}")

if __name__ == "__main__":
    main()
