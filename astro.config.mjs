import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://beautydiaro.com',
  integrations: [
    tailwind(),
    sitemap(),
  ],
  build: {
    assets: 'assets',
  },
});
