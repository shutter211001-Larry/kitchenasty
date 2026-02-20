import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

const updateSettingsSchema = z.object({
  siteName: z.string().min(1).optional(),
  siteTitle: z.string().min(1).optional(),
  colorPrimary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  colorSecondary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  darkMode: z.enum(['light', 'dark', 'system']).optional(),
  heroSection: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
    ctaPrimaryText: z.string().optional(),
    ctaPrimaryLink: z.string().optional(),
    ctaSecondaryText: z.string().optional(),
    ctaSecondaryLink: z.string().optional(),
    backgroundImage: z.string().optional(),
  }).optional(),
  featuresSection: z.array(z.object({
    icon: z.string(),
    title: z.string(),
    description: z.string(),
  })).optional(),
  ctaSection: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    buttonText: z.string().optional(),
    buttonLink: z.string().optional(),
  }).optional(),
});

async function getOrCreateSettings() {
  let settings = await prisma.siteSettings.findUnique({ where: { id: 'default' } });
  if (!settings) {
    settings = await prisma.siteSettings.create({ data: { id: 'default' } });
  }
  return settings;
}

export async function getSettings(_req: Request, res: Response): Promise<void> {
  const settings = await getOrCreateSettings();
  res.json({ success: true, data: settings });
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  const parsed = updateSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  await getOrCreateSettings();

  const settings = await prisma.siteSettings.update({
    where: { id: 'default' },
    data: parsed.data,
  });

  res.json({ success: true, data: settings });
}

export async function uploadLogo(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  await getOrCreateSettings();

  const logoPath = `/uploads/${req.file.filename}`;
  const settings = await prisma.siteSettings.update({
    where: { id: 'default' },
    data: { logo: logoPath },
  });

  res.json({ success: true, data: settings });
}

export async function uploadFavicon(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ success: false, error: 'No file uploaded' });
    return;
  }

  await getOrCreateSettings();

  const faviconPath = `/uploads/${req.file.filename}`;
  const settings = await prisma.siteSettings.update({
    where: { id: 'default' },
    data: { favicon: faviconPath },
  });

  res.json({ success: true, data: settings });
}
