import tkinter as tk
from tkinter import ttk
import re
from tkinter import simpledialog

import requests
from bs4 import BeautifulSoup

PENCIL_ICON_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABPklEQVR4nO2WPWrDQBBGP5sc"
    "YQ6RO3hqVwJvWlUqBL6CqhSpdAKDQYUqt06xVeoYfIFAatcufINJYWsRaLX+0Y4a54MtlhW"
    "8tzMDWuA/zxLDJKMCrbUOaJjktFqJT2KiDa/KDHX64c6yzTs+v4+OqyJgmCQvarfnw8ELV4"
    "lhEvlZiGESa61bfTMQ1cYwyXY9c/u35Q7tSiRJ0uFNteAAsF3PUJWZ27dnI6qAD+6T8FVg"
    "cAtCcODchtDgDarAUPgggRjwhwViwR8SiAm/WyA2/C4BDfjNAlrwmwQ04VcFtOFBgTHgQYEG"
    "ognvjWGSfZ3Kvk6l+b83K/bb7uoQFvncVULj5h0BwyRFPu98qFX2l9BhWX0BgP47DgCYWZre"
    "G6bove6LuxkzCwAQfse58SXTNhwAjngdi30OM0tb4OnyB5Ta0thcH/qZAAAAAElFTkSuQmCC"
)


class SimpleTextEditor(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title("簡単エディター")
        self.geometry("900x650")
        self.minsize(600, 400)

        self._icon = tk.PhotoImage(data=PENCIL_ICON_B64)
        self.iconphoto(True, self._icon)

        self.create_widgets()
        self.bind_events()
        self.update_counts()

    def create_widgets(self):
        toolbar1 = ttk.Frame(self, padding=(8, 8, 8, 2))
        toolbar1.pack(side=tk.TOP, fill=tk.X)

        ttk.Button(toolbar1, text="太字", command=self.wrap_bold).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar1, text="赤字", command=self.wrap_red).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar1, text="青字", command=self.wrap_blue).pack(side=tk.LEFT, padx=(0, 8))

        self.total_label = ttk.Label(toolbar1, text="全体文字数：0")
        self.total_label.pack(side=tk.RIGHT, padx=(12, 0))

        self.selected_label = ttk.Label(toolbar1, text="選択範囲：0")
        self.selected_label.pack(side=tk.RIGHT)

        toolbar2 = ttk.Frame(self, padding=(8, 2, 8, 4))
        toolbar2.pack(side=tk.TOP, fill=tk.X)

        ttk.Button(toolbar2, text="URL", command=self.insert_url).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar2, text="Quote", command=self.insert_quote).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar2, text="LinkCard", command=self.insert_linkcard).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar2, text="Spotify", command=self.insert_spotify).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar2, text="YouTube", command=self.insert_youtube).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar2, text="Expand", command=self.insert_expand).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar2, text="画像リンク", command=self.insert_img_link).pack(side=tk.LEFT, padx=(0, 8))

        toolbar3 = ttk.Frame(self, padding=(8, 2, 8, 4))
        toolbar3.pack(side=tk.TOP, fill=tk.X)

        ttk.Button(toolbar3, text="Tab", command=self.insert_tab).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar3, text="中央線", command=self.insert_center_line).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(toolbar3, text="改行", command=self.insert_br).pack(side=tk.LEFT, padx=(0, 8))

        text_frame = ttk.Frame(self, padding=(8, 0, 8, 8))
        text_frame.pack(side=tk.TOP, fill=tk.BOTH, expand=True)

        self.text = tk.Text(
            text_frame,
            wrap=tk.CHAR,
            undo=True,
            font=("Yu Gothic UI", 12),
            padx=12,
            pady=12,
        )
        self.text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(text_frame, orient=tk.VERTICAL, command=self.text.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.text.configure(yscrollcommand=scrollbar.set)

    def bind_events(self):
        self.text.bind("<KeyRelease>", lambda e: self.update_counts())
        self.text.bind("<ButtonRelease-1>", lambda e: self.update_counts())
        self.text.bind("<B1-Motion>", lambda e: self.after(1, self.update_counts))
        self.text.bind("<<Selection>>", lambda e: self.update_counts())

        # ショートカット
        self.bind_all("<Control-b>", lambda e: self.wrap_bold())
        self.bind_all("<Control-r>", lambda e: self.wrap_red())

    def get_all_text(self):
        return self.text.get("1.0", "end-1c")

    def get_selected_text(self):
        try:
            return self.text.get(tk.SEL_FIRST, tk.SEL_LAST)
        except tk.TclError:
            return ""

    def strip_tags(self, text):
        return re.sub(r"<[^>]+>", "", text)

    def update_counts(self):
        all_text = self.get_all_text()
        selected_text = self.get_selected_text()

        clean_all = self.strip_tags(all_text)
        clean_selected = self.strip_tags(selected_text)

        self.total_label.config(text=f"全体文字数：{len(clean_all)}")
        self.selected_label.config(text=f"選択範囲：{len(clean_selected)}")

    def wrap_selection(self, before, after):
        try:
            start = self.text.index(tk.SEL_FIRST)
            end = self.text.index(tk.SEL_LAST)
        except tk.TclError:
            self.text.focus_set()
            return

        selected_text = self.text.get(start, end)
        if not selected_text:
            return

        # 複数行選択時にも崩れないよう、全文を再構築する
        full_text = self.get_all_text()

        start_offset = self.text.count("1.0", start, "chars")[0]
        end_offset = self.text.count("1.0", end, "chars")[0]

        new_text = (
            full_text[:start_offset]
            + before
            + selected_text
            + after
            + full_text[end_offset:]
        )

        self.text.edit_separator()

        self.text.delete("1.0", tk.END)
        self.text.insert("1.0", new_text)

        # 元の本文だけ再選択
        new_start_offset = start_offset + len(before)
        new_end_offset = new_start_offset + len(selected_text)

        new_start = f"1.0+{new_start_offset}c"
        new_end = f"1.0+{new_end_offset}c"

        self.text.tag_remove(tk.SEL, "1.0", tk.END)
        self.text.tag_add(tk.SEL, new_start, new_end)
        self.text.mark_set(tk.INSERT, new_end)
        self.text.focus_set()

        self.text.edit_separator()
        self.update_counts()

    def wrap_bold(self):
        self.wrap_selection("<strong>", "</strong>")

    def wrap_red(self):
        self.wrap_selection('<span style="color:red">', "</span>")

    def wrap_blue(self):
        self.wrap_selection('<span style="color:blue">', "</span>")

    def insert_url(self):
        try:
            selected_text = self.get_selected_text()
        except tk.TclError:
            return

        if not selected_text:
            return

        url = simpledialog.askstring("URL入力", "URLを入力してください")
        if not url:
            return

        before = f'<URL h="{url}">'
        after = '</URL>'
        self.wrap_selection(before, after)

    def insert_quote(self):
        url = simpledialog.askstring("Quote URL入力", "引用元URLを入力してください")
        if not url:
            return

        selected_text = self.get_selected_text()

        if selected_text:
            before = f'<Quote source="" sourceUrl="{url}">'
            after = '</Quote>'
            self.wrap_selection(before, after)
        else:
            insert_text = f'<Quote source="" sourceUrl="{url}"></Quote>'

            self.text.edit_separator()
            self.text.insert(tk.INSERT, insert_text)
            self.text.edit_separator()

            self.update_counts()

    def fetch_ogp_data(self, url):
        title = ""
        description = ""
        image = ""

        try:
            response = requests.get(
                url,
                timeout=10,
                headers={
                    "User-Agent": "Mozilla/5.0"
                }
            )

            soup = BeautifulSoup(response.text, "html.parser")

            def get_meta(property_name=None, name=None):
                try:
                    if property_name:
                        tag = soup.find("meta", property=property_name)
                        if tag and tag.get("content"):
                            return tag.get("content")

                    if name:
                        tag = soup.find("meta", attrs={"name": name})
                        if tag and tag.get("content"):
                            return tag.get("content")

                except Exception:
                    pass

                return ""

            # title
            try:
                title = (
                    get_meta(property_name="og:title")
                    or (soup.title.string.strip() if soup.title and soup.title.string else "")
                )
            except Exception:
                pass

            # description
            try:
                description = (
                    get_meta(property_name="og:description")
                    or get_meta(name="description")
                )
            except Exception:
                pass

            # image
            try:
                image = get_meta(property_name="og:image")
            except Exception:
                pass

        except Exception:
            pass

        return {
            "title": title,
            "description": description,
            "image": image,
        }

    def insert_linkcard(self):
        url = simpledialog.askstring("LinkCard URL入力", "URLを入力してください")
        if not url:
            return

        ogp = self.fetch_ogp_data(url)

        insert_text = f'''<LinkCard
  url="{url}"
  title="{ogp["title"]}"
  description="{ogp["description"]}"
  image="{ogp["image"]}"
  newTab={{true}}
/>'''

        self.text.edit_separator()
        self.text.insert(tk.INSERT, insert_text)
        self.text.edit_separator()

        self.update_counts()

    def insert_spotify(self):
        url = simpledialog.askstring("Spotify URL入力", "Spotify URLを入力してください")
        if not url:
            return

        insert_text = f'<Spotify url="{url}" />'

        self.text.edit_separator()
        self.text.insert(tk.INSERT, insert_text)
        self.text.edit_separator()

        self.update_counts()

    def insert_youtube(self):
        url = simpledialog.askstring("YouTube URL入力", "YouTube URLを入力してください")
        if not url:
            return

        insert_text = f'<YouTube url="{url}" />'

        self.text.edit_separator()
        self.text.insert(tk.INSERT, insert_text)
        self.text.edit_separator()

        self.update_counts()

    def insert_expand(self):
        insert_pos = self.text.index(tk.INSERT)
        snippet = "<Expand>\n\n</Expand>"

        self.text.edit_separator()
        self.text.insert(insert_pos, snippet)
        self.text.edit_separator()

        self.update_counts()

    def insert_tab(self):
        label = simpledialog.askstring("Tab ラベル入力", "タブ名称を入力してください")
        if not label:
            return

        insert_text = f'<Tab label="{label}">\n\n</Tab>'

        self.text.edit_separator()
        self.text.insert(tk.INSERT, insert_text)
        self.text.edit_separator()

        self.update_counts()

    def insert_center_line(self):
        self.text.edit_separator()
        self.text.insert(tk.INSERT, '<p style="text-align: center">・・・・・</p>')
        self.text.edit_separator()
        self.update_counts()

    def insert_br(self):
        self.text.edit_separator()
        self.text.insert(tk.INSERT, "<br />")
        self.text.edit_separator()
        self.update_counts()

    def insert_img_link(self):
        url = simpledialog.askstring("リンクURL入力", "リンク先URLを入力してください")
        if not url:
            return

        img_url = simpledialog.askstring("画像URL入力", "画像URLを入力してください")
        if not img_url:
            return

        insert_text = f'<a href="{url}"><img src="{img_url}" width="200" height="200" /></a>'

        self.text.edit_separator()
        self.text.insert(tk.INSERT, insert_text)
        self.text.edit_separator()

        self.update_counts()


if __name__ == "__main__":
    app = SimpleTextEditor()
    app.mainloop()
