import { Request, Response } from 'express';
import { z } from 'zod';
import fs from 'fs';
import prisma from '../lib/db.js';
import { generateGeminiVisionObject } from '../lib/ai.js';
import { autoTranslateCategory, autoTranslateMenuItem } from '../lib/translation-helper.js';

export async function detectMenuFromImages(req: Request, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    res.status(400).json({ success: false, error: 'No images provided' });
    return;
  }

  try {
    const base64Images = await Promise.all(
      files.map(async (file) => {
        const buffer = await fs.promises.readFile(file.path);
        const base64 = buffer.toString('base64');
        return { data: base64, mimeType: file.mimetype };
      })
    );

    // Clean up temporary files
    await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));

    const prompt = `
      You are a professional menu digitization assistant.
      I will provide you with images of a physical restaurant menu.
      Please extract all categories and the items within them.
      For each item, extract the name, price (as a number), and description (if any).
      Return ONLY a valid JSON object matching this schema exactly:
      {
        "categories": [
          {
            "name": "string",
            "items": [
              {
                "name": "string",
                "price": number,
                "description": "string"
              }
            ]
          }
        ]
      }
    `;

    const result = await generateGeminiVisionObject(prompt, base64Images);
    res.json({ success: true, data: result });
  } catch (error: any) {
    // Clean up in case of error
    await Promise.all(files.map((file) => fs.promises.unlink(file.path).catch(() => {})));
    res.status(500).json({ success: false, error: error.message || 'Failed to analyze images' });
  }
}

const importSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
          price: z.number(),
          description: z.string().optional().nullable(),
        })
      )
    })
  )
});

function generateSlug(name: string): string {
  // A simple slug generator that replaces non-alphanumeric with hyphens
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  return base ? `${base}-${randomSuffix}` : `item-${randomSuffix}`;
}

export async function importMenuAndTranslate(req: Request, res: Response): Promise<void> {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  try {
    const { categories } = parsed.data;
    
    // Process sequentially to avoid DB locks or overwhelming AI translations
    for (const cat of categories) {
      // Create category data
      const catData = {
        name: cat.name,
        slug: generateSlug(cat.name),
        isActive: true,
        sortOrder: 0,
      };
      
      const translatedCatData = await autoTranslateCategory(catData);
      const createdCategory = await prisma.category.create({
        data: translatedCatData
      });

      // Create items for this category
      for (const item of cat.items) {
        const itemData = {
          name: item.name,
          slug: generateSlug(item.name),
          price: item.price,
          description: item.description || '',
          isActive: true,
          sortOrder: 0,
          categoryId: createdCategory.id,
          unit: '份', // Default unit
        };

        const translatedItemData = await autoTranslateMenuItem(itemData);
        await prisma.menuItem.create({
          data: translatedItemData
        });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to import menu' });
  }
}
