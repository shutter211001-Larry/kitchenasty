import { Request, Response } from 'express';
import { PrismaClient } from '@shutter-erp/client';

const prisma = new PrismaClient();

export const getLabelManufacturers = async (req: Request, res: Response) => {
  try {
    const manufacturers = await prisma.labelManufacturer.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(manufacturers);
  } catch (error) {
    console.error('Failed to get label manufacturers:', error);
    res.status(500).json({ error: 'Failed to fetch label manufacturers' });
  }
};

export const createLabelManufacturer = async (req: Request, res: Response) => {
  try {
    const data = req.body;
    const manufacturer = await prisma.labelManufacturer.create({
      data: {
        name: data.name,
        companyName: data.companyName,
        companyPhone: data.companyPhone,
        companyAddress: data.companyAddress,
        originCountry: data.originCountry,
        brandNameZh: data.brandNameZh,
        brandNameEn: data.brandNameEn
      }
    });
    res.status(201).json(manufacturer);
  } catch (error) {
    console.error('Failed to create label manufacturer:', error);
    res.status(500).json({ error: 'Failed to create label manufacturer' });
  }
};

export const updateLabelManufacturer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;
    
    const manufacturer = await prisma.labelManufacturer.update({
      where: { id },
      data: {
        name: data.name,
        companyName: data.companyName,
        companyPhone: data.companyPhone,
        companyAddress: data.companyAddress,
        originCountry: data.originCountry,
        brandNameZh: data.brandNameZh,
        brandNameEn: data.brandNameEn
      }
    });
    res.json(manufacturer);
  } catch (error) {
    console.error('Failed to update label manufacturer:', error);
    res.status(500).json({ error: 'Failed to update label manufacturer' });
  }
};

export const deleteLabelManufacturer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.labelManufacturer.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete label manufacturer:', error);
    res.status(500).json({ error: 'Failed to delete label manufacturer' });
  }
};
