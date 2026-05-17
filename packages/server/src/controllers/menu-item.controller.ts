import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { auditLog } from '../lib/audit.js';
import { autoTranslateMenuItem } from '../lib/translation-helper.js';

const menuOptionValueSchema = z.object({
  name: z.string().min(1),
  nameTranslations: z.record(z.string()).optional(),
  priceModifier: z.number().default(0),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

const menuOptionSchema = z.object({
  name: z.string().min(1),
  nameTranslations: z.record(z.string()).optional(),
  displayType: z.enum(['SELECT', 'RADIO', 'CHECKBOX', 'QUANTITY']).default('SELECT'),
  isRequired: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  sortOrder: z.number().int().min(0).default(0),
  values: z.array(menuOptionValueSchema).min(1),
});

const createMenuItemSchema = z.object({
  name: z.string().min(1),
  nameTranslations: z.record(z.string()).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().optional(),
  descriptionTranslations: z.record(z.string()).optional(),
  price: z.number().min(0),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  trackStock: z.boolean().default(false),
  stockQty: z.number().int().min(0).default(0),
  unit: z.string().optional(),
  unitTranslations: z.record(z.string()).optional(),
  orderType: z.enum(['DELIVERY', 'PICKUP']).nullable().optional(),
  categoryId: z.string().min(1),
  locationId: z.string().optional(),
  options: z.array(menuOptionSchema).optional(),
  allergenIds: z.array(z.string()).optional(),
  mealtimeIds: z.array(z.string()).optional(),
  dietaryPreferenceIds: z.array(z.string()).optional(),
  recipeId: z.string().optional(),
  recipeName: z.string().optional(),
});

const updateMenuItemSchema = createMenuItemSchema.partial().omit({ slug: true });

export async function listMenuItems(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const categoryId = req.query.categoryId as string | undefined;
  const search = req.query.search as string | undefined;

  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [items, total] = await Promise.all([
    prisma.menuItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: { select: { id: true, name: true, nameTranslations: true } },
        allergens: { include: { allergen: true } },
        dietaryPreferences: { include: { dietaryPreference: true } },
        _count: { select: { options: true } },
      },
    }),
    prisma.menuItem.count({ where }),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getMenuItem(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const item = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, nameTranslations: true } },
      options: {
        orderBy: { sortOrder: 'asc' },
        include: {
          values: { orderBy: { sortOrder: 'asc' } },
        },
      },
      allergens: { include: { allergen: true } },
      mealtimes: { include: { mealtime: true } },
      dietaryPreferences: { include: { dietaryPreference: true } },
    },
  });

  if (!item) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  res.json({ success: true, data: item });
}

export async function createMenuItem(req: Request, res: Response): Promise<void> {
  const parsed = createMenuItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { options, allergenIds, mealtimeIds, dietaryPreferenceIds, recipeId, recipeName, ...data } = parsed.data;

  const existing = await prisma.menuItem.findUnique({ where: { slug: data.slug } });
  if (existing) {
    res.status(409).json({ success: false, error: 'A menu item with this slug already exists' });
    return;
  }

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
  if (!category) {
    res.status(400).json({ success: false, error: 'Category not found' });
    return;
  }

  // Auto-translate fields before creation
  const translatedData = await autoTranslateMenuItem(data);

  const item = await prisma.menuItem.create({
    data: {
      ...translatedData,
      options: options ? {
        create: options.map((opt) => ({
          name: opt.name,
          nameTranslations: opt.nameTranslations,
          displayType: opt.displayType,
          isRequired: opt.isRequired,
          minSelect: opt.minSelect,
          maxSelect: opt.maxSelect,
          sortOrder: opt.sortOrder,
          values: {
            create: opt.values.map((v) => ({
              name: v.name,
              nameTranslations: v.nameTranslations,
              priceModifier: v.priceModifier,
              isDefault: v.isDefault,
              sortOrder: v.sortOrder,
            })),
          },
        })),
      } : undefined,
      allergens: allergenIds?.length ? {
        create: allergenIds.map((allergenId) => ({ allergenId })),
      } : undefined,
      mealtimes: mealtimeIds?.length ? {
        create: mealtimeIds.map((mealtimeId) => ({ mealtimeId })),
      } : undefined,
      dietaryPreferences: dietaryPreferenceIds?.length ? {
        create: dietaryPreferenceIds.map((dietaryPreferenceId) => ({ dietaryPreferenceId })),
      } : undefined,
    },
    include: {
      category: { select: { id: true, name: true, nameTranslations: true } },
      options: { include: { values: true } },
      allergens: { include: { allergen: true } },
      mealtimes: { include: { mealtime: true } },
      dietaryPreferences: { include: { dietaryPreference: true } },
    },
  });

  auditLog(req, { action: 'create', entity: 'MenuItem', entityId: item.id, details: { name: item.name } });

  // If a recipeId is provided, automatically link it with PizzaMaster ERP
  if (recipeId) {
    try {
      const url = process.env.PIZZAMASTER_API_URL || 'http://localhost:3000';
      const response = await fetch(`${url}/api/integration/mappings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-integration-key': process.env.INTEGRATION_KEY || 'pizzamaster-integration-secret-key'
        },
        body: JSON.stringify({
          menuItemId: item.id,
          recipeId: recipeId,
          menuItemName: item.name,
          menuItemPrice: item.price,
          recipeName: recipeName || item.name
        })
      });
      if (!response.ok) {
        console.error(`[ERP Integration] Failed to auto-link menu item to recipe. HTTP ${response.status}`);
      } else {
        console.log(`[ERP Integration] Successfully auto-linked menu item ${item.name} to recipe ${recipeName}`);
      }
    } catch (err) {
      console.error(`[ERP Integration] Error auto-linking recipe:`, err);
    }
  }

  res.status(201).json({ success: true, data: item });
}

export async function updateMenuItem(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateMenuItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  const { options, allergenIds, mealtimeIds, dietaryPreferenceIds, ...data } = parsed.data;

  // Auto-translate fields before update
  const translatedData = await autoTranslateMenuItem(data, existing);

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...translatedData,
      options: options ? {
        deleteMany: {},
        create: options.map((opt) => ({
          name: opt.name,
          nameTranslations: opt.nameTranslations,
          displayType: opt.displayType,
          isRequired: opt.isRequired,
          minSelect: opt.minSelect,
          maxSelect: opt.maxSelect,
          sortOrder: opt.sortOrder,
          values: {
            create: opt.values.map((v) => ({
              name: v.name,
              nameTranslations: v.nameTranslations,
              priceModifier: v.priceModifier,
              isDefault: v.isDefault,
              sortOrder: v.sortOrder,
            })),
          },
        })),
      } : undefined,
      allergens: allergenIds !== undefined ? {
        deleteMany: {},
        create: allergenIds.map((allergenId) => ({ allergenId })),
      } : undefined,
      mealtimes: mealtimeIds !== undefined ? {
        deleteMany: {},
        create: mealtimeIds.map((mealtimeId) => ({ mealtimeId })),
      } : undefined,
      dietaryPreferences: dietaryPreferenceIds !== undefined ? {
        deleteMany: {},
        create: dietaryPreferenceIds.map((dietaryPreferenceId) => ({ dietaryPreferenceId })),
      } : undefined,
    },
    include: {
      category: { select: { id: true, name: true, nameTranslations: true } },
      options: { include: { values: true } },
      allergens: { include: { allergen: true } },
      mealtimes: { include: { mealtime: true } },
      dietaryPreferences: { include: { dietaryPreference: true } },
    },
  });

  auditLog(req, { action: 'update', entity: 'MenuItem', entityId: id, details: data });

  res.json({ success: true, data: item });
}

export async function deleteMenuItem(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  const orderItemCount = await prisma.orderItem.count({ where: { menuItemId: id } });
  if (orderItemCount > 0) {
    res.status(409).json({
      success: false,
      error: 'Cannot delete menu item with existing orders. Deactivate it instead.',
    });
    return;
  }

  await prisma.menuItem.delete({ where: { id } });
  auditLog(req, { action: 'delete', entity: 'MenuItem', entityId: id, details: { name: existing.name } });
  res.json({ success: true, message: 'Menu item deleted' });
}

export async function uploadMenuItemImage(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, error: 'No image file provided' });
    return;
  }

  const imagePath = `/uploads/${req.file.filename}`;

  const item = await prisma.menuItem.update({
    where: { id },
    data: { image: imagePath },
    include: {
      category: { select: { id: true, name: true, nameTranslations: true } },
    },
  });

  res.json({ success: true, data: item });
}

export async function deleteMenuItemImage(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: { image: null },
    include: {
      category: { select: { id: true, name: true, nameTranslations: true } },
    },
  });

  res.json({ success: true, data: item });
}

export async function getErpProductRecipes(req: Request, res: Response): Promise<void> {
  try {
    const url = process.env.PIZZAMASTER_API_URL || 'http://localhost:3000';
    const response = await fetch(`${url}/api/integration/product-recipes`, {
      headers: {
        'x-integration-key': process.env.INTEGRATION_KEY || 'pizzamaster-integration-secret-key'
      }
    });

    if (!response.ok) {
      res.status(response.status).json({ success: false, error: 'Failed to fetch product recipes from ERP' });
      return;
    }

    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error(`[ERP Integration] Error fetching product recipes:`, err);
    res.status(500).json({ success: false, error: err.message });
  }
}
