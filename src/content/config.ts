import { defineCollection, z } from 'astro:content';

const products = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    nameEn: z.string(),
    category: z.enum(['護膚系列', '彩妝系列', '身體護理']),
    price: z.string(),
    volume: z.string(),
    shortDesc: z.string(),
    image: z.string(),
    tags: z.array(z.string()),
    ingredients: z.array(z.string()),
    skinType: z.string(),
    rating: z.number().default(5),
  }),
});

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    category: z.enum(['護膚技巧', '成分解析', '彩妝教學', '防曬知識']),
    excerpt: z.string(),
    relatedPosts: z.array(z.string()).optional(),
  }),
});

export const collections = { products, blog };
