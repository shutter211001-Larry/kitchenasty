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
      For each item, extract the name, price (as a number), description (if any), and any options.
      If the menu item has choices (e.g. "乾/湯", "大/中/小", "加蛋", "冷/熱"), extract them into the \`options\` array instead of the description.
      For example, if an item says "乾/湯", the option name could be "種類" with values "乾", "湯".
      Return ONLY a valid JSON object matching this schema exactly:
      {
        "categories": [
          {
            "name": "string",
            "items": [
              {
                "name": "string",
                "price": number,
                "description": "string",
                "options": [
                  {
                    "name": "string (e.g. '種類', '大小', '加料')",
                    "isRequired": boolean,
                    "maxSelect": number (default 1, but if multiple choices allowed like '加料', set to a larger number e.g. 10),
                    "values": [
                      {
                        "name": "string",
                        "priceModifier": number (default 0 if no extra cost)
                      }
                    ]
                  }
                ]
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
      action: z.enum(['MERGE', 'CREATE']).optional(),
      targetCategoryId: z.string().optional(),
      name: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
          price: z.number(),
          description: z.string().optional().nullable(),
          options: z.array(
            z.object({
              name: z.string(),
              isRequired: z.boolean(),
              maxSelect: z.number().optional(),
              values: z.array(
                z.object({
                  name: z.string(),
                  priceModifier: z.number()
                })
              )
            })
          ).optional()
        })
      )
    })
  )
});

async function generateSlug(name: string, model: 'category' | 'menuItem'): Promise<string> {
  const base = name.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/(^-|-$)/g, '');
  let candidate = base || `item-${Math.random().toString(36).substring(2, 6)}`;
  
  const existing = model === 'category'
    ? await prisma.category.findUnique({ where: { slug: candidate } })
    : await prisma.menuItem.findUnique({ where: { slug: candidate } });

  if (!existing) return candidate;
  
  return `${candidate}-${Math.random().toString(36).substring(2, 6)}`;
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
      let categoryId = '';
      
      if (cat.action === 'MERGE' && cat.targetCategoryId) {
        // Verify target category exists
        const existingCat = await prisma.category.findUnique({
          where: { id: cat.targetCategoryId }
        });
        if (!existingCat) {
          throw new Error(`Target category ${cat.targetCategoryId} not found for merge.`);
        }
        categoryId = existingCat.id;
      } else {
        // Create category data
        const catData = {
          name: cat.name,
          slug: await generateSlug(cat.name, 'category'),
          isActive: true,
          sortOrder: 0,
        };
        
        const translatedCatData = await autoTranslateCategory(catData);
        const createdCategory = await prisma.category.create({
          data: translatedCatData
        });
        categoryId = createdCategory.id;
      }

      // Create items for this category
      for (const item of cat.items) {
        // Check if item already exists in this category
        const existingItem = await prisma.menuItem.findFirst({
          where: {
            categoryId: categoryId,
            name: item.name
          }
        });

        if (existingItem) {
          // Update price only
          await prisma.menuItem.update({
            where: { id: existingItem.id },
            data: { price: item.price }
          });
          continue; // Skip creating options for updated items to avoid complexity
        }

        const itemData = {
          name: item.name,
          slug: await generateSlug(item.name, 'menuItem'),
          price: item.price,
          description: item.description || '',
          isActive: true,
          sortOrder: 0,
          categoryId: categoryId,
          unit: '份', // Default unit
        };

        const translatedItemData = await autoTranslateMenuItem(itemData);
        
        let optionsToCreate: any = undefined;
        if (item.options && item.options.length > 0) {
          optionsToCreate = {
            create: item.options.map((opt: any, optIndex: number) => {
              const maxSel = opt.maxSelect || 1;
              return {
                name: opt.name,
                isRequired: opt.isRequired,
                displayType: maxSel > 1 ? 'CHECKBOX' : 'RADIO',
                minSelect: opt.isRequired ? 1 : 0,
                maxSelect: maxSel,
                sortOrder: optIndex,
                values: {
                  create: opt.values.map((v: any, vIndex: number) => ({
                    name: v.name,
                    priceModifier: v.priceModifier || 0,
                    sortOrder: vIndex,
                    isDefault: false
                  }))
                }
              };
            })
          };
        }

        await prisma.menuItem.create({
          data: {
            ...translatedItemData,
            options: optionsToCreate
          }
        });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to import menu' });
  }
}
