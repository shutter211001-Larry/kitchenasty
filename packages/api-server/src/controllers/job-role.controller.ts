import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const createJobRoleSchema = z.object({
  name: z.string().min(1),
  locationId: z.string().optional().nullable(),
});

const updateJobRoleSchema = createJobRoleSchema.partial();

const assignRoleSchema = z.object({
  userIds: z.array(z.string()),
});

// ============================================================
// HANDLERS
// ============================================================

export async function listJobRoles(req: Request, res: Response): Promise<void> {
  const { locationId } = req.query;

  const jobRoles = await prisma.jobRole.findMany({
    where: locationId ? { locationId: locationId as string } : undefined,
    include: {
      users: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, data: jobRoles });
}

export async function createJobRole(req: Request, res: Response): Promise<void> {
  const parsed = createJobRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid data', details: parsed.error.errors });
    return;
  }

  const jobRole = await prisma.jobRole.create({
    data: parsed.data,
    include: { users: { select: { id: true, name: true } } },
  });

  res.status(201).json({ success: true, data: jobRole });
}

export async function updateJobRole(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = updateJobRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid data', details: parsed.error.errors });
    return;
  }

  const jobRole = await prisma.jobRole.update({
    where: { id },
    data: parsed.data,
    include: { users: { select: { id: true, name: true } } },
  });

  res.json({ success: true, data: jobRole });
}

export async function deleteJobRole(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  
  await prisma.jobRole.delete({ where: { id } });
  
  res.json({ success: true, message: 'JobRole deleted' });
}

// Assign users to a job role (replaces existing users for this role)
export async function assignUsersToRole(req: Request<{ id: string }>, res: Response): Promise<void> {
  const { id } = req.params;
  const parsed = assignRoleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: 'Invalid data', details: parsed.error.errors });
    return;
  }

  const jobRole = await prisma.jobRole.update({
    where: { id },
    data: {
      users: {
        set: parsed.data.userIds.map(userId => ({ id: userId })),
      },
    },
    include: { users: { select: { id: true, name: true, email: true } } },
  });

  res.json({ success: true, data: jobRole });
}
