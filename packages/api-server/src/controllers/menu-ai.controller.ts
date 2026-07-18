import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { generateGeminiVisionObject } from '../lib/ai.js';
import { SUPPORTED_LANGUAGES, autoTranslateCategory, autoTranslateMenuItem } from '../lib/translation-helper.js';
import { tenantStorage } from '../middleware/tenantStorage.js';
import logger from '../lib/logger.js';

export async function detectMenuFromImages(req: Request, res: Response): Promise<void> {
  const files = req.files as Express.Multer.File[];
  
  if (!files || files.length === 0) {
    res.status(400).json({ success: false, error: 'No images provided' });
    return;
  }

  try {
    const base64Images = files.map((file) => {
      const base64 = file.buffer.toString('base64');
      return { data: base64, mimeType: file.mimetype };
    });

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

async function backgroundMissingTranslations(tenantId: string) {
  tenantStorage.run({ tenantId }, async () => {
    try {
      logger.info(`Starting background menu translation for tenant ${tenantId}`);
      
      const categories = await prisma.category.findMany({
        where: { translationStatus: { in: ['PENDING', 'FAILED'] } }
      });
      
      for (const cat of categories) {
        try {
          const nameTrans = (cat.nameTranslations as Record<string, string>) || {};
          if (Object.keys(nameTrans).length < SUPPORTED_LANGUAGES.length) {
            const translatedCatData = await autoTranslateCategory(cat);
            await prisma.category.update({
              where: { id: cat.id },
              data: {
                nameTranslations: translatedCatData.nameTranslations,
                descriptionTranslations: translatedCatData.descriptionTranslations,
                translationStatus: 'TRANSLATED'
              }
            });
          } else {
            await prisma.category.update({
              where: { id: cat.id },
              data: { translationStatus: 'TRANSLATED' }
            });
          }
        } catch (err) {
          logger.error(err as any, `Failed to translate category ${cat.id}`);
          await prisma.category.update({
            where: { id: cat.id },
            data: { translationStatus: 'FAILED' }
          });
        }
      }

      const items = await prisma.menuItem.findMany({
        where: { translationStatus: { in: ['PENDING', 'FAILED'] } }
      });

      for (const item of items) {
        try {
          const nameTrans = (item.nameTranslations as Record<string, string>) || {};
          const descTrans = (item.descriptionTranslations as Record<string, string>) || {};
          if (Object.keys(nameTrans).length < SUPPORTED_LANGUAGES.length || (item.description && Object.keys(descTrans).length < SUPPORTED_LANGUAGES.length)) {
            const translatedItemData = await autoTranslateMenuItem(item);
            await prisma.menuItem.update({
              where: { id: item.id },
              data: {
                nameTranslations: translatedItemData.nameTranslations,
                descriptionTranslations: translatedItemData.descriptionTranslations,
                unitTranslations: translatedItemData.unitTranslations,
                translationStatus: 'TRANSLATED'
              }
            });
          } else {
            await prisma.menuItem.update({
              where: { id: item.id },
              data: { translationStatus: 'TRANSLATED' }
            });
          }
        } catch (err) {
          logger.error(err as any, `Failed to translate menu item ${item.id}`);
          await prisma.menuItem.update({
            where: { id: item.id },
            data: { translationStatus: 'FAILED' }
          });
        }
      }

      logger.info(`Finished background menu translation for tenant ${tenantId}`);
    } catch (error) {
      logger.error(error as any, `Background translation failed for tenant ${tenantId}`);
    }
  });
}

export async function autoResumeAllMenuTranslations() {
  logger.info('Running global background menu translation resume...');
  try {
    const [categories, items] = await Promise.all([
      prisma.$queryRaw<{tenantId: string}[]>`SELECT DISTINCT "tenantId" FROM "categories" WHERE "translationStatus" IN ('PENDING'::"TranslationStatus", 'FAILED'::"TranslationStatus")`,
      prisma.$queryRaw<{tenantId: string}[]>`SELECT DISTINCT "tenantId" FROM "menu_items" WHERE "translationStatus" IN ('PENDING'::"TranslationStatus", 'FAILED'::"TranslationStatus")`
    ]);
    
    const tenantIds = new Set<string>();
    categories.forEach(c => c.tenantId && tenantIds.add(c.tenantId));
    items.forEach(i => i.tenantId && tenantIds.add(i.tenantId));

    for (const tenantId of tenantIds) {
      await backgroundMissingTranslations(tenantId);
    }
  } catch (error) {
    logger.error(error as any, 'Failed to run global menu translation resume');
  }
}

export async function importMenuAndTranslate(req: Request, res: Response): Promise<void> {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  try {
    const { categories } = parsed.data;
    const store = tenantStorage.getStore();
    const tenantId = store?.tenantId;
    
    for (const cat of categories) {
      let categoryId = '';
      
      if (cat.action === 'MERGE' && cat.targetCategoryId) {
        const existingCat = await prisma.category.findUnique({
          where: { id: cat.targetCategoryId }
        });
        if (!existingCat) {
          throw new Error(`Target category ${cat.targetCategoryId} not found for merge.`);
        }
        categoryId = existingCat.id;
      } else {
        const catData = {
          name: cat.name,
          slug: await generateSlug(cat.name, 'category'),
          isActive: true,
          sortOrder: 0,
          nameTranslations: { 'zh-TW': cat.name },
          translationStatus: 'PENDING' as any
        };
        
        const createdCategory = await prisma.category.create({
          data: catData
        });
        categoryId = createdCategory.id;
      }

      for (const item of cat.items) {
        const existingItem = await prisma.menuItem.findFirst({
          where: {
            categoryId: categoryId,
            name: item.name
          }
        });

        if (existingItem) {
          await prisma.menuItem.update({
            where: { id: existingItem.id },
            data: { price: item.price }
          });
          continue;
        }

        const itemData = {
          name: item.name,
          slug: await generateSlug(item.name, 'menuItem'),
          price: item.price,
          description: item.description || '',
          isActive: true,
          sortOrder: 0,
          categoryId: categoryId,
          unit: '份',
          nameTranslations: { 'zh-TW': item.name },
          descriptionTranslations: item.description ? { 'zh-TW': item.description } : {},
          unitTranslations: { 'zh-TW': '份' },
          translationStatus: 'PENDING' as any
        };
        
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
            ...itemData,
            options: optionsToCreate
          }
        });
      }
    }

    if (tenantId) {
      backgroundMissingTranslations(tenantId).catch(err => logger.error(err as any, 'Background translation job rejected'));
    }

    res.json({ success: true, message: 'Menu imported. Translations are running in the background.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to import menu' });
  }
}

export async function getMissingTranslations(req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      where: { translationStatus: { in: ['PENDING', 'FAILED'] } }
    });
    const missingCats = categories.map(c => ({ id: c.id, name: c.name, status: c.translationStatus }));

    const items = await prisma.menuItem.findMany({
      where: { translationStatus: { in: ['PENDING', 'FAILED'] } }
    });
    const missingItems = items.map(i => ({ id: i.id, name: i.name, status: i.translationStatus }));

    res.json({ success: true, data: { categories: missingCats, items: missingItems } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}

export async function resumeTranslation(req: Request, res: Response): Promise<void> {
  try {
    const store = tenantStorage.getStore();
    const tenantId = store?.tenantId;
    if (!tenantId) {
      res.status(400).json({ success: false, error: 'Tenant ID required' });
      return;
    }

    backgroundMissingTranslations(tenantId).catch(err => logger.error(err as any, 'Resume translation job rejected'));
    res.json({ success: true, message: 'Background translation resumed.' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
}
