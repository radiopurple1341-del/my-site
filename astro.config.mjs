import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import remarkBreaks from 'remark-breaks';

export default defineConfig({
  site: 'https://without-sound.org',
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkBreaks],
  },

  vite: {
    assetsInclude: ['**/*.jpg', '**/*.png']
  }
});