import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION, SITE_URL } from '../consts';

export async function GET(context) {
  const articles = (await getCollection('article'))
    .sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime())
    .slice(0, 20);

  return rss({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    site: context.site ?? SITE_URL,
    items: articles.map(article => ({
      title: article.data.title,
      pubDate: article.data.pubDate,
      description: article.data.description,
      link: article.data.externalUrl ?? `/article/${article.id}/`,
    })),
  });
}
