import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { uploadImage, parseS3Settings } from '../lib/s3.js';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { auditLog } from '../lib/audit.js';
import { autoTranslateMenuItem } from '../lib/translation-helper.js';
import { invalidateKVCache } from '../lib/cloudflare.js';

function getErpUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  let url = trimmed;
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  if (!url.includes('/shutter-erp')) {
    const base = url.endsWith('/') ? url.slice(0, -1) : url;
    return `${base}/shutter-erp`;
  }
  return url;
}


const menuOptionValueSchema = z.object({
  name: z.string().min(1),
  nameTranslations: z.record(z.string().nullable()).optional(),
  priceModifier: z.number().default(0),
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
  trackStock: z.boolean().default(false).optional(),
  stockQty: z.number().int().min(0).default(0).optional(),
});

const menuOptionSchema = z.object({
  name: z.string().min(1),
  nameTranslations: z.record(z.string().nullable()).optional(),
  displayType: z.enum(['SELECT', 'RADIO', 'CHECKBOX', 'QUANTITY']).default('SELECT'),
  isRequired: z.boolean().default(false),
  minSelect: z.number().int().min(0).default(0),
  maxSelect: z.number().int().min(1).default(1),
  sortOrder: z.number().int().min(0).default(0),
  values: z.array(menuOptionValueSchema).min(1),
});

const createMenuItemSchema = z.object({
  name: z.string().min(1),
  nameTranslations: z.record(z.string().nullable()).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  description: z.string().nullable().optional(),
  descriptionTranslations: z.record(z.string().nullable()).optional(),
  price: z.number().min(0),
  image: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  trackStock: z.boolean().default(false),
  stockQty: z.number().int().min(0).default(0),
  unit: z.string().nullable().optional(),
  unitTranslations: z.record(z.string().nullable()).optional(),
  orderType: z.enum(['DELIVERY', 'PICKUP', 'FROZEN_DELIVERY', 'DINE_IN']).nullable().optional(),
  categoryId: z.string().min(1),
  locationId: z.string().nullable().optional(),
  isRewardItem: z.boolean().default(false).optional(),
  rewardPointsPrice: z.number().int().min(0).default(0).optional(),
  options: z.array(menuOptionSchema).optional(),
  allergenIds: z.array(z.string()).optional(),
  mealtimeIds: z.array(z.string()).optional(),
  dietaryPreferenceIds: z.array(z.string()).optional(),
  recipeId: z.string().nullable().optional(),
  recipeName: z.string().nullable().optional(),
  cropData: z.any().optional(),
  prepTime: z.number().min(0).default(0).optional(),
  isRandomDispatch: z.boolean().default(false).optional(),
  randomDispatchPool: z.array(z.object({
    id: z.string(),
    weight: z.number().min(1).default(1)
  })).optional(),
  hasGachaAnimation: z.boolean().default(true).optional(),
  showProbabilities: z.boolean().default(false).optional(),
});

const updateMenuItemSchema = createMenuItemSchema.partial().extend({
  contextLocationId: z.string().nullable().optional()
}).omit({ slug: true });

async function enrichRandomDispatchPools(items: any[], locationId?: string) {
  const poolItemIds = new Set<string>();
  items.forEach(item => {
    if (item.isRandomDispatch && Array.isArray(item.randomDispatchPool)) {
      item.randomDispatchPool.forEach((p: any) => {
        if (typeof p === 'string') poolItemIds.add(p);
        else if (p && typeof p.id === 'string') poolItemIds.add(p.id);
      });
    }
  });

  if (poolItemIds.size === 0) return;

  const poolItems = await prisma.menuItem.findMany({
    where: { id: { in: Array.from(poolItemIds) } },
    select: { 
      id: true, name: true, nameTranslations: true, image: true, price: true, trackStock: true, stockQty: true, isActive: true, locationId: true,
      ...(locationId ? { locationOverrides: { where: { locationId } } } : {})
    }
  });

  if (locationId) {
    poolItems.forEach(item => {
      if (item.locationOverrides && item.locationOverrides.length > 0) {
        const override = item.locationOverrides[0];
        item.isActive = override.isActive;
        item.trackStock = override.trackStock;
        item.stockQty = override.stockQty;
      } else if (item.locationId !== locationId) {
        item.stockQty = 0;
      }
      delete (item as any).locationOverrides;
    });
  }

  const poolItemMap = new Map(poolItems.map(p => [p.id, p]));

  items.forEach(item => {
    if (item.isRandomDispatch && Array.isArray(item.randomDispatchPool)) {
      item.randomDispatchPool = item.randomDispatchPool.map((p: any) => {
        const id = typeof p === 'string' ? p : p.id;
        const weight = typeof p === 'string' ? 1 : (p.weight || 1);
        const childItem = poolItemMap.get(id);
        if (!childItem) return null;
        return {
          id,
          weight,
          name: childItem.name,
          nameTranslations: childItem.nameTranslations,
          image: childItem.image,
          price: childItem.price,
          trackStock: childItem.trackStock,
          stockQty: childItem.stockQty,
          isActive: childItem.isActive
        };
      }).filter(Boolean);
    }
  });
}

export async function listMenuItems(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 20));
  const skip = (page - 1) * limit;
  const categoryId = req.query.categoryId as string | undefined;
  const search = req.query.search as string | undefined;
  let locationId = req.query.locationId as string | undefined;

  let queryLocationIds: string[] = [];
  let originalLocationId = locationId;

  if (locationId) {
    queryLocationIds.push(locationId);
    const loc = await prisma.location.findUnique({
      where: { id: locationId },
      select: { syncSettingsWithMain: true, parentLocationId: true }
    });
    if (loc?.syncSettingsWithMain && loc.parentLocationId) {
      queryLocationIds.push(loc.parentLocationId);
    }
  }

  const where: Record<string, unknown> = {};
  if (categoryId) where.categoryId = categoryId;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  if (queryLocationIds.length > 0) {
    where.OR = [
      { locationId: null },
      { locationId: { in: queryLocationIds } }
    ];
  }

  const [items, total] = await Promise.all([
    prisma.menuItem.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        category: { select: { id: true, name: true, nameTranslations: true, isFrozenDelivery: true, sortOrder: true } },
        location: { select: { id: true, name: true } },
        allergens: { include: { allergen: true } },
        dietaryPreferences: { include: { dietaryPreference: true } },
        _count: { select: { options: true } },
        options: {
          orderBy: { sortOrder: 'asc' },
          include: {
            values: { 
              orderBy: { sortOrder: 'asc' },
              ...(originalLocationId ? {
                include: {
                  locationOverrides: { where: { locationId: originalLocationId } }
                }
              } : {})
            },
          },
        },
        ...(originalLocationId ? {
          locationOverrides: { where: { locationId: originalLocationId } }
        } : {})
      },
    }),
    prisma.menuItem.count({ where }),
  ]);

  // Apply Overrides
  if (originalLocationId) {
    items.forEach((item: any) => {
      if (item.locationOverrides && item.locationOverrides.length > 0) {
        const override = item.locationOverrides[0];
        item.isActive = override.isActive;
        item.trackStock = override.trackStock;
        item.stockQty = override.stockQty;
      } else if (item.locationId !== originalLocationId) {
        item.stockQty = 0;
      }
      delete item.locationOverrides;

      if (item.options) {
        item.options.forEach((opt: any) => {
          if (opt.values) {
            opt.values.forEach((val: any) => {
              if (val.locationOverrides && val.locationOverrides.length > 0) {
                const vOverride = val.locationOverrides[0];
                val.trackStock = vOverride.trackStock;
                val.stockQty = vOverride.stockQty;
              } else if (item.locationId !== originalLocationId) {
                val.stockQty = 0;
              }
              delete val.locationOverrides;
            });
          }
        });
      }
    });
  }

  await enrichRandomDispatchPools(items, originalLocationId);

  res.json({
    success: true,
    data: items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

export async function getMenuItem(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;

  let locationId = req.query.locationId as string | undefined;

  const item: any = await prisma.menuItem.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, nameTranslations: true, isFrozenDelivery: true } },
      options: {
        orderBy: { sortOrder: 'asc' },
        include: {
          values: { 
            orderBy: { sortOrder: 'asc' },
            ...(locationId ? {
              include: {
                locationOverrides: { where: { locationId } }
              }
            } : {})
          },
        },
      },
      allergens: { include: { allergen: true } },
      mealtimes: { include: { mealtime: true } },
      dietaryPreferences: { include: { dietaryPreference: true } },
      ...(locationId ? {
        locationOverrides: { where: { locationId } }
      } : {})
    },
  });

  if (!item) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  // Apply Overrides
  if (locationId) {
    if (item.locationOverrides && item.locationOverrides.length > 0) {
      const override = item.locationOverrides[0];
      item.isActive = override.isActive;
      item.trackStock = override.trackStock;
      item.stockQty = override.stockQty;
    } else if (item.locationId !== locationId) {
      item.stockQty = 0;
    }
    delete item.locationOverrides;

    if (item.options) {
      item.options.forEach((opt: any) => {
        if (opt.values) {
          opt.values.forEach((val: any) => {
            if (val.locationOverrides && val.locationOverrides.length > 0) {
              const vOverride = val.locationOverrides[0];
              val.trackStock = vOverride.trackStock;
              val.stockQty = vOverride.stockQty;
            } else if (item.locationId !== locationId) {
              val.stockQty = 0;
            }
            delete val.locationOverrides;
          });
        }
      });
    }
  }

  await enrichRandomDispatchPools([item], locationId);

  // Fetch recipe mapping from ERP if available
  let recipeId = null;
  let recipeName = null;
  try {
    const url = process.env.API_URL_PUBLIC || 'http://localhost:3000';
    const response = await fetch(`${getErpUrl(url)}/api/integration/mappings`, {
      headers: {
        'x-integration-key': process.env.INTEGRATION_KEY || 'shutter-erp-integration-secret-key'
      }
    });
    if (response.ok) {
      const resData = await response.json();
      const mapping = (resData.data || []).find((m: any) => m.menuItemId === id);
      if (mapping) {
        recipeId = mapping.recipeId;
        recipeName = mapping.recipeName;
      }
    }
  } catch (err) {
    console.error(`[ERP Integration] Error fetching mapping for menu item ${id}:`, err);
  }

  res.json({
    success: true,
    data: {
      ...item,
      recipeId,
      recipeName,
    },
  });
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
              trackStock: v.trackStock,
              stockQty: v.stockQty,
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
      category: { select: { id: true, name: true, nameTranslations: true, isFrozenDelivery: true } },
      options: { include: { values: true } },
      allergens: { include: { allergen: true } },
      mealtimes: { include: { mealtime: true } },
      dietaryPreferences: { include: { dietaryPreference: true } },
    },
  });

  auditLog(req, { action: 'create', entity: 'MenuItem', entityId: item.id, details: { name: item.name } });

  // If a recipeId is provided, automatically link it with Shutter ERP
  if (recipeId) {
    try {
      const url = process.env.API_URL_PUBLIC || 'http://localhost:3000';
      const response = await fetch(`${getErpUrl(url)}/api/integration/mappings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-integration-key': process.env.INTEGRATION_KEY || 'shutter-erp-integration-secret-key'
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

  // Invalidate Cloudflare KV Cache
  invalidateKVCache('menu_', item.locationId || undefined);

  res.status(201).json({ success: true, data: item });
}

export async function updateMenuItem(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateMenuItemSchema.safeParse(req.body);
  if (!parsed.success) {
    console.error('[Zod Validation Failure] PATCH /items/' + id, JSON.stringify(parsed.error.errors, null, 2));
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  const { options, allergenIds, mealtimeIds, dietaryPreferenceIds, recipeId, recipeName, contextLocationId, ...data } = parsed.data;

  // Enforce Location RBAC: if modifying branch-specific data, ensure they have access to that branch
  if (contextLocationId && req.user && req.user.type === 'staff' && req.user.role !== 'SUPER_ADMIN') {
    if (req.user.locationId !== contextLocationId) {
      res.status(403).json({ success: false, error: 'Unauthorized branch access' });
      return;
    }
  }

  const isFollowedItem = contextLocationId && existing.locationId !== contextLocationId;

  if (isFollowedItem) {
    if (data.isActive !== undefined || data.trackStock !== undefined || data.stockQty !== undefined) {
      await prisma.menuItemLocationOverride.upsert({
        where: { menuItemId_locationId: { menuItemId: id, locationId: contextLocationId } },
        create: {
          menuItemId: id,
          locationId: contextLocationId,
          isActive: data.isActive ?? existing.isActive,
          trackStock: data.trackStock ?? existing.trackStock,
          stockQty: data.stockQty ?? existing.stockQty
        },
        update: {
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(data.trackStock !== undefined ? { trackStock: data.trackStock } : {}),
          ...(data.stockQty !== undefined ? { stockQty: data.stockQty } : {}),
        }
      });
    }

    if (options) {
      for (const opt of options) {
        if (opt.values) {
          for (const val of opt.values) {
            // Option values overrides are mapped by value ID. Since frontend options list includes IDs, we can update.
            // Wait, the frontend might not send ID if it's a new option, but for follow items, they shouldn't create new options anyway.
            if ((val as any).id) {
              await prisma.menuOptionValueLocationOverride.upsert({
                where: { menuOptionValueId_locationId: { menuOptionValueId: (val as any).id, locationId: contextLocationId } },
                create: {
                  menuOptionValueId: (val as any).id,
                  locationId: contextLocationId,
                  isActive: (val as any).isActive !== undefined ? (val as any).isActive : true,
                  trackStock: val.trackStock !== undefined ? val.trackStock : false,
                  stockQty: val.stockQty !== undefined ? val.stockQty : 0
                },
                update: {
                  ...((val as any).isActive !== undefined ? { isActive: (val as any).isActive } : {}),
                  ...(val.trackStock !== undefined ? { trackStock: val.trackStock } : {}),
                  ...(val.stockQty !== undefined ? { stockQty: val.stockQty } : {}),
                }
              });
            }
          }
        }
      }
    }

    res.json({ success: true, data: existing });
    return;
  }

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
              trackStock: v.trackStock,
              stockQty: v.stockQty,
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
      category: { select: { id: true, name: true, nameTranslations: true, isFrozenDelivery: true } },
      options: { include: { values: true } },
      allergens: { include: { allergen: true } },
      mealtimes: { include: { mealtime: true } },
      dietaryPreferences: { include: { dietaryPreference: true } },
    },
  });

  auditLog(req, { action: 'update', entity: 'MenuItem', entityId: id, details: data });

  // Update or delete R&D recipe binding in Shutter ERP if recipeId is specified
  if (recipeId !== undefined) {
    try {
      const url = process.env.API_URL_PUBLIC || 'http://localhost:3000';
      if (recipeId) {
        // Save/update mapping
        const response = await fetch(`${getErpUrl(url)}/api/integration/mappings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-integration-key': process.env.INTEGRATION_KEY || 'shutter-erp-integration-secret-key'
          },
          body: JSON.stringify({
            menuItemId: id,
            recipeId: recipeId,
            menuItemName: item.name,
            menuItemPrice: item.price,
            recipeName: recipeName || item.name
          })
        });
        if (!response.ok) {
          console.error(`[ERP Integration] Failed to update link of menu item ${id} to recipe. HTTP ${response.status}`);
        } else {
          console.log(`[ERP Integration] Successfully updated link of menu item ${item.name} to recipe ${recipeName}`);
        }
      } else {
        // Delete/unbind mapping
        const response = await fetch(`${getErpUrl(url)}/api/integration/mappings/${id}`, {
          method: 'DELETE',
          headers: {
            'x-integration-key': process.env.INTEGRATION_KEY || 'shutter-erp-integration-secret-key'
          }
        });
        if (!response.ok) {
          console.error(`[ERP Integration] Failed to delete link of menu item ${id}. HTTP ${response.status}`);
        } else {
          console.log(`[ERP Integration] Successfully deleted link of menu item ${item.name}`);
        }
      }
    } catch (err) {
      console.error(`[ERP Integration] Error updating recipe link:`, err);
    }
  }

  // Invalidate Cloudflare KV Cache
  invalidateKVCache('menu_', item.locationId || undefined);

  res.json({ success: true, data: item });
}

export async function deleteMenuItem(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const locationId = req.query.locationId as string | undefined;

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  if (locationId && existing.locationId !== locationId) {
    res.status(403).json({
      success: false,
      error: 'Cannot delete a followed menu item from a child location.',
    });
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

  // Invalidate Cloudflare KV Cache
  invalidateKVCache('menu_', existing.locationId || undefined);

  res.json({ success: true, message: 'Menu item deleted' });
}

export async function uploadMenuItemImage(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const ratio = req.query.ratio as string | undefined;

  const existing = await prisma.menuItem.findUnique({ where: { id } });
  if (!existing) {
    res.status(404).json({ success: false, error: 'Menu item not found' });
    return;
  }

  if (!req.file) {
    res.status(400).json({ success: false, error: 'No image file provided' });
    return;
  }

  const { getResolvedS3Settings } = await import('../lib/s3.js');
  const s3Settings = await getResolvedS3Settings(existing.tenantId);

  const imagePath = await uploadImage(req.file, s3Settings);


  let updateData: any = {};
  if (ratio) {
    const currentVariants = (typeof existing.imageVariants === 'object' && existing.imageVariants !== null)
      ? existing.imageVariants
      : {};
    updateData.imageVariants = {
      ...(currentVariants as object),
      [ratio]: imagePath,
    };
    
    // Also update the main image so there's always a fallback
    updateData.image = imagePath;
  } else {
    updateData.image = imagePath;
  }

  const item = await prisma.menuItem.update({
    where: { id },
    data: updateData,
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
    const url = process.env.API_URL_PUBLIC || 'http://localhost:3000';
    const response = await fetch(`${getErpUrl(url)}/api/integration/product-recipes`, {
      headers: {
        'x-integration-key': process.env.INTEGRATION_KEY || 'shutter-erp-integration-secret-key'
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
