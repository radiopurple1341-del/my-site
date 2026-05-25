# generate.py
# Spotify URLからAstroブログ用コンテンツファイルを生成するスクリプト

import csv
import sys
import os
import re
import requests
import base64
from datetime import datetime
from pathlib import Path

try:
    import pykakasi
    _kks = pykakasi.kakasi()
    def _to_romaji(text):
        return " ".join(item["hepburn"] for item in _kks.convert(text))
except ImportError:
    print("[WARN] pykakasi not installed. Japanese in slugs will not be converted.")
    def _to_romaji(text):
        return text

# -------------------------------------------------------
# Config
# -------------------------------------------------------

def load_config(config_path):
    config = {}
    with open(config_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                config[key.strip()] = val.strip()
    return config

# -------------------------------------------------------
# Spotify
# -------------------------------------------------------

def get_token(client_id, client_secret):
    credentials = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    r = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {credentials}"},
        data={"grant_type": "client_credentials"},
    )
    r.raise_for_status()
    return r.json()["access_token"]

def get_album(album_id, token):
    r = requests.get(
        f"https://api.spotify.com/v1/albums/{album_id}",
        headers={"Authorization": f"Bearer {token}"},
    )
    r.raise_for_status()
    return r.json()

def extract_album_id(url):
    m = re.search(r"/album/([A-Za-z0-9]+)", url)
    if not m:
        raise ValueError(f"Cannot extract album ID from URL: {url}")
    return m.group(1)

# -------------------------------------------------------
# Slug
# -------------------------------------------------------

def to_slug(text):
    text = _to_romaji(text)
    text = text.lower()
    text = re.sub(r"\s+", "_", text)
    text = re.sub(r"[^\w\-]", "", text)
    return text

# -------------------------------------------------------
# File generators
# -------------------------------------------------------

def generate_work_index(info, out_dir):
    d = out_dir / "src" / "content" / "work_index"
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"{info['base_id']}.md"

    work_month_line = f"workMonth: {info['work_month']}\n" if info["work_month"] else ""
    work_type_line  = f'workType: "{info["work_type"]}"\n' if info["work_type"] else ""
    if info.get("description"):
        indented = "\n".join(f"  {l}" for l in info["description"].splitlines())
    else:
        indented = "  "
    description_line = f"description: |\n{indented}\n"

    content = f"""---
title: "{info['title']}"
artist: "{info['artist']}"
category: {info['category']}
workYear: {info['work_year']}
{work_month_line}{work_type_line}tags: []
{description_line}thumbnail: "/artworks/{info['base_id']}.jpg"
---
"""
    path.write_text(content, encoding="utf-8")
    return path

def generate_article(info, out_dir, tracks):
    d = out_dir / "src" / "content" / "article" / "works"
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"{info['base_id']}.mdx"

    today     = datetime.now().strftime("%Y-%m-%d")
    tab_label = datetime.now().strftime("%Y/%m/%d")

    track_lines = []
    for t in tracks:
        title_escaped = t["title"].replace('"', '\\"')
        track_lines.append(
            f'    {{ n: {t["n"]}, title: "{title_escaped}", mark: "", lyric: "", music: "", arrange: "", producer: "", time: "{t["time"]}" }},'
        )
    track_block = "\n".join(track_lines)

    article_title = f"{info['artist']}『{info['title']}』"

    content = f"""---
title: "{article_title}"
pubDate: {today}
description: ""
category: {info['category']}
tags: [{info['artist']}]
featured: false
workId: "{info['base_id']}"
artwork: "/artworks/{info['base_id']}.jpg"
rating: {info['rating']}
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
import Review from '../../../components/Review.astro';
import Quote from '../../../components/Quote.astro';
import LinkCard from '../../../components/LinkCard.astro';

<Tabs>
  <Tab label="{tab_label}" active>

## トラックリスト
<TrackLegend />
<Tracklist
  defaultLyric=""
  defaultMusic=""
  defaultArrange=""
  defaultProducer=""
  tracks={{[
{track_block}
  ]}}
/>

<Review rating={{{info['rating']}}}></Review>
<Spotify url="{info['spotify_url']}" />

  </Tab>
</Tabs>

---
"""
    path.write_text(content, encoding="utf-8")
    return path

def save_artwork(info, out_dir, album):
    d = out_dir / "public" / "artworks"
    d.mkdir(parents=True, exist_ok=True)
    path = d / f"{info['base_id']}.jpg"

    images = album.get("images", [])
    if not images:
        raise ValueError("No images found in album")

    image_url = sorted(images, key=lambda x: x.get("width", 0), reverse=True)[0]["url"]
    r = requests.get(image_url)
    r.raise_for_status()
    path.write_bytes(r.content)
    return path

# -------------------------------------------------------
# Process one CSV row
# -------------------------------------------------------

VALID_CATEGORIES = {"音楽", "映画", "漫画", "ゲーム", "文章", "その他"}

def process_row(row, token, out_dir):
    url = row.get("url", "").strip()
    if not url:
        raise ValueError("url is empty")

    rating_str = row.get("rating", "").strip()
    if not rating_str:
        raise ValueError("rating is empty")
    rating = int(rating_str)

    album_id = extract_album_id(url)
    album    = get_album(album_id, token)

    # Spotifyから取得した値
    api_title  = album["name"]
    api_artist = " / ".join(a["name"] for a in album["artists"])
    api_year   = int(album["release_date"].split("-")[0])
    api_month_str = album["release_date"].split("-")
    api_month  = int(api_month_str[1]) if len(api_month_str) >= 2 else None

    # CSVの値で上書き（空なら自動取得値を使用）
    title     = row.get("title", "").strip()   or api_title
    artist    = row.get("artist", "").strip()  or api_artist
    category  = row.get("category", "").strip()
    if category not in VALID_CATEGORIES:
        category = "音楽"
    work_type = row.get("workType", "").strip() or "アルバム"
    gen_article = row.get("genArticle", "true").strip().lower() != "false"

    base_id = f"{to_slug(artist)}-{to_slug(title)}"

    # トラックリスト
    tracks = []
    for i, t in enumerate(album["tracks"]["items"], 1):
        ms  = t["duration_ms"]
        m   = ms // 60000
        s   = (ms % 60000) // 1000
        tracks.append({"n": i, "title": t["name"], "time": f"{m}:{s:02d}"})

    info = {
        "base_id":     base_id,
        "title":       title,
        "artist":      artist,
        "category":    category,
        "work_year":   api_year,
        "work_month":  api_month,
        "work_type":   work_type,
        "spotify_url": url,
        "rating":      rating,
        "description": row.get("description", "").strip(),
    }

    results = {"artwork": False, "index": False, "article": False}

    try:
        save_artwork(info, out_dir, album)
        results["artwork"] = True
    except Exception as e:
        print(f"    [artwork] NG: {e}")

    try:
        generate_work_index(info, out_dir)
        results["index"] = True
    except Exception as e:
        print(f"    [index]   NG: {e}")

    if gen_article:
        try:
            generate_article(info, out_dir, tracks)
            results["article"] = True
        except Exception as e:
            print(f"    [article] NG: {e}")
    else:
        results["article"] = None  # スキップ

    return info, results

# -------------------------------------------------------
# Main
# -------------------------------------------------------

def main():
    script_dir = Path(__file__).parent
    config     = load_config(script_dir / "config.txt")

    client_id     = config.get("SPOTIFY_CLIENT_ID", "")
    client_secret = config.get("SPOTIFY_CLIENT_SECRET", "")
    timestamp  = datetime.now().strftime("%Y%m%d-%H%M%S")
    output_dir = script_dir / f"output-{timestamp}" 

    if client_id in ("", "your-client-id-here"):
        print("[ERROR] Please set SPOTIFY_CLIENT_ID in config.txt")
        sys.exit(1)

    csv_path = script_dir / "input.csv"
    if not csv_path.exists():
        print(f"[ERROR] input.csv not found: {csv_path}")
        sys.exit(1)

    print("=" * 48)
    print("  Astro Content Generator")
    print("=" * 48)
    print()

    # トークン取得
    print("[*] Getting Spotify token...")
    try:
        token = get_token(client_id, client_secret)
        print("[OK] Token acquired")
    except Exception as e:
        print(f"[ERROR] Failed to get token: {e}")
        sys.exit(1)

    # CSV読み込み（#コメント行スキップ）
    rows = []
    with open(csv_path, encoding="utf-8") as f:
        filtered = (line for line in f if not line.strip().startswith("#"))
        reader = csv.DictReader(filtered)
        for row in reader:
            rows.append(row)

    if not rows:
        print("[ERROR] No data rows found in input.csv")
        sys.exit(1)

    print(f"\n{len(rows)} album(s) to process\n")
    print("-" * 48)

    # ログ用
    log_lines = []
    log_lines.append(f"Run: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    log_lines.append("-" * 48)

    for i, row in enumerate(rows, 1):
        url = row.get("url", "").strip()
        print(f"[{i}/{len(rows)}] {url}")

        try:
            info, results = process_row(row, token, output_dir)
            artwork_str = "OK" if results["artwork"] else "NG"
            index_str   = "OK" if results["index"]   else "NG"
            article_str = "OK" if results["article"] else ("SKIP" if results["article"] is None else "NG")

            print(f"    artwork: {artwork_str}  |  index: {index_str}  |  article: {article_str}")
            print(f"    base_id: {info['base_id']}")

            log_lines.append(f"[{i}] {url}")
            log_lines.append(f"    base_id : {info['base_id']}")
            log_lines.append(f"    artwork : {artwork_str}")
            log_lines.append(f"    index   : {index_str}")
            log_lines.append(f"    article : {article_str}")

        except Exception as e:
            print(f"    [SKIP] Fatal error: {e}")
            log_lines.append(f"[{i}] {url}")
            log_lines.append(f"    [SKIP] Fatal error: {e}")

        print()

    print("-" * 48)
    print("Done!")
    print(f"Output: {output_dir}")

    # ログ書き出し
    log_path = script_dir / "log.txt"
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines) + "\n")
    print(f"Log:    {log_path}")
    print()

if __name__ == "__main__":
    main()
