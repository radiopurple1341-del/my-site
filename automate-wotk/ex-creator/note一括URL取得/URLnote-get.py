import requests
import time

user = "okyouth2head"
page = 1
all_urls = []

headers = {
    "User-Agent": "Mozilla/5.0"
}

while True:
    url = f"https://note.com/api/v2/creators/{user}/contents?kind=note&page={page}"
    res = requests.get(url, headers=headers)

    if res.status_code != 200:
        print("停止：status code", res.status_code)
        break

    data = res.json()
    contents = data["data"]["contents"]

    if not contents:
        print("終了：全ページ取得")
        break

    for item in contents:
        all_urls.append(item["noteUrl"])

    print(f"page {page} 取得")
    page += 1
    time.sleep(0.5)

# 重複除去
all_urls = list(dict.fromkeys(all_urls))

# 🔽 txtファイル出力
with open("note_urls.txt", "w", encoding="utf-8") as f:
    for url in all_urls:
        f.write(url + "\n")

print(f"\n保存完了：{len(all_urls)}件 → note_urls.txt")