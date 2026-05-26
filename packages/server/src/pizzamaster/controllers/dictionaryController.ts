import { Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';

export const getActionGroups = async (req: Request, res: Response) => {
  try {
    const groups = await prisma.actionGroup.findMany({
      include: {
        defaultUnitGroups: true,
        actions: {
          include: { defaultUnitGroups: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(groups);
  } catch (error) {
    console.error('[getActionGroups]', error);
    res.status(500).json({ error: 'Failed to fetch action groups' });
  }
};

export const getUnitGroups = async (req: Request, res: Response) => {
  try {
    const groups = await prisma.unitGroup.findMany({
      include: { units: true },
      orderBy: { createdAt: 'asc' }
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch unit groups' });
  }
};

export const createActionGroup = async (req: Request, res: Response) => {
  try {
    const { name, icon } = req.body;
    const group = await prisma.actionGroup.create({
      data: { name, icon }
    });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create action group' });
  }
};

export const deleteActionGroup = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.actionGroup.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete action group' });
  }
};

export const setActionGroupDefaultUnits = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { unitGroupIds } = req.body; // array of UnitGroup IDs
    await prisma.actionGroup.update({
      where: { id },
      data: {
        defaultUnitGroups: {
          set: (unitGroupIds || []).map((uid: string) => ({ id: uid }))
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[setActionGroupDefaultUnits]', error);
    res.status(500).json({ error: 'Failed to set action group default units' });
  }
};

export const createAction = async (req: Request, res: Response) => {
  try {
    const { name, groupId } = req.body;
    const action = await prisma.action.create({
      data: { name, groupId },
      include: { defaultUnitGroups: true }
    });
    res.json(action);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create action' });
  }
};

export const deleteAction = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.action.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete action' });
  }
};

export const setActionDefaultUnits = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { unitGroupIds } = req.body; // array of UnitGroup IDs
    await prisma.action.update({
      where: { id },
      data: {
        defaultUnitGroups: {
          set: (unitGroupIds || []).map((uid: string) => ({ id: uid }))
        }
      }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('[setActionDefaultUnits]', error);
    res.status(500).json({ error: 'Failed to set action default units' });
  }
};

export const createUnitGroup = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const group = await prisma.unitGroup.create({ data: { name } });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create unit group' });
  }
};

export const deleteUnitGroup = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.unitGroup.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete unit group' });
  }
};

export const createUnit = async (req: Request, res: Response) => {
  try {
    const { name, groupId } = req.body;
    const unit = await prisma.unit.create({ data: { name, groupId } });
    res.json(unit);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create unit' });
  }
};

export const deleteUnit = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.unit.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete unit' });
  }
};
