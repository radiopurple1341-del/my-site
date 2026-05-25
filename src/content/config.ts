// このファイルは使われていません。Astro v6 のコンテンツ設定は src/content.config.ts を使用してください。

import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 日記：短文、毎日更新（本文はMarkdown本文に書く）
const diary = defineCollection({
  loader: glob({ base: './src/content/diary', pattern: '**/*.md' }),
  schema: z.object({
    pubDate: z.coerce.date(),
  }),
});

// 記事：本サイト記事 or 外部リンク記事（note/FC2）
const article = defineCollection({
  loader: glob({ base: './src/content/article', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string(),           // 独自紹介文（外部記事にもつける）
    category: z.enum(['音楽', '映画', '漫画', 'ゲーム', '文章', 'その他']),
    tags: z.array(z.string()).default([]),
    externalUrl: z.string().url().optional(), // noteやFC2のURL
    thumbnail: z.string().optional(),          // 画像パス or 外部URL
    artwork: z.string().optional(),            // work記事のアートワーク画像
    featured: z.boolean().default(false),      // ランダム表示対象
    workYear: z.number().int().min(1900).max(2100).optional(),  // 作品発表年（例: 1991）
    workMonth: z.number().int().min(1).max(12).optional(),      // 作品発表月（任意）
    workId: z.string().optional(),             // work/ コレクションのIDと対応
  }),
});

// 作品：記事の有無に関わらず作品リストに載せたいもの
const work = defineCollection({
  loader: glob({ base: './src/content/work_index', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string(),                         // 作品名
    artist: z.string(),                        // アーティスト / 監督 / 著者など
    category: z.enum(['音楽', '映画', '漫画', 'ゲーム', '文章', 'その他']),
    workYear: z.number().int().min(1900).max(2100),
    workMonth: z.number().int().min(1).max(12).optional(),
    workType: z.string().optional(),           // 例: アルバム / 映画 / 漫画
    thumbnail: z.string().optional(),          // 作品ページ用サムネイル画像
  }).passthrough(),
});

export const collections = { diary, article, work };
