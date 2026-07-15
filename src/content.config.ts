import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 日記：短文、毎日更新（本文はMarkdown本文に書く）
const diary = defineCollection({
  loader: glob({ base: './src/content/diary', pattern: '**/*.md' }),
  schema: z.object({
    pubDate: z.coerce.date().optional(),
    character: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// 記事：本サイト記事 or 外部リンク記事（note/FC2）
const article = defineCollection({
  loader: glob({ base: './src/content/article', pattern: '**/[^_]*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string(),           // 独自紹介文（外部記事にもつける）
    category: z.enum(['音楽', '映画', '漫画', 'ゲーム', '書籍', '文章']),
    tags: z.array(z.string()).default([]),
    externalUrl: z.string().url().optional(), // noteやFC2のURL
    thumbnail: z.string().optional(),          // 画像パス or 外部URL
    featured: z.boolean().default(false),      // ランダム表示対象
    workYear: z.number().int().min(1900).max(2100).nullish(),
    workMonth: z.number().int().min(1).max(12).nullish(),
    workId: z.string().nullish(),              // work/ コレクションのIDと対応
    artwork: z.string().optional(),           // ジャケ画像パス（public/artworks/）
    rating: z.number().min(0).max(100).optional(), // 評点（100点満点）
    curated: z.boolean().optional(),          // 他サイト記事キュレーション（external_curated/配下）
    author: z.string().optional(),            // 著者名（external_curatedで使用）
    siteName: z.string().optional(),          // 掲載サイト名（external_curatedで使用）
    addedDate: z.coerce.date().optional(),    // サイト登録日（external_curatedのソート用）
  }),
});

// 作品：記事の有無に関わらず作品リストに載せたいもの
const work = defineCollection({
  loader: glob({ base: './src/content/work_index', pattern: '**/[^_]*.md' }),
  schema: z.object({
    title: z.string(),
    artist: z.string().optional(),
    category: z.enum(['音楽', '映画', '漫画', 'ゲーム', '書籍', 'その他']),
    workYear: z.number().int().min(1900).max(2100).optional(),
    workMonth: z.number().int().min(1).max(12).optional(),
    workType: z.string().optional(),
    tags: z.array(z.string()).optional(),
    thumbnail: z.string().optional(),
    description: z.string().optional(),        // 一言メモ（作品リストの「一言」列に表示）
    pubDate: z.coerce.date().optional(),       // 登録日（空欄ならbirthtime参照）
    isGuide: z.boolean().optional(),           // 特集記事フラグ（外部記事を強調・トップページ表示対象）
    isSpecial: z.boolean().optional(),         // 特集記事フラグ（本サイトmdx記事を強調・トップページ表示対象外）
  }),
});

export const collections = { diary, article, work };
