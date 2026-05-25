import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import remarkBreaks from 'remark-breaks';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://example.com',
  integrations: [mdx(), sitemap()],

  markdown: {
    remarkPlugins: [remarkBreaks],
  },

  vite: {
    assetsInclude: ['**/*.jpg', '**/*.png']
  },

  adapter: cloudflare()
});