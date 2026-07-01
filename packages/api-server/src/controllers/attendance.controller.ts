import { Request, Response } from 'express';
import prisma from '../lib/db.js';

// Haversine formula to calculate distance in meters
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000; // Radius of the earth in m
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in m
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export const checkIn = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { locationId, lat, lng, device } = req.body;

  if (!userId || !locationId || lat === undefined || lng === undefined) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const location = await prisma.location.findUnique({
    where: { id: locationId }
  });

  if (!location) {
    return res.status(404).json({ success: false, error: 'Location not found' });
  }

  let isOutOfRange = false;
  if (location.lat && location.lng) {
    const distance = getDistanceFromLatLonInM(lat, lng, location.lat, location.lng);
    if (distance > 100) {
      isOutOfRange = true;
    }
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const existing = await prisma.staffAttendance.findFirst({
    where: {
      userId,
      locationId,
      checkIn: { gte: startOfDay },
      checkOut: null
    }
  });

  if (existing) {
    return res.status(400).json({ success: false, error: 'Already checked in without checkout today' });
  }

  const record = await prisma.staffAttendance.create({
    data: {
      userId,
      locationId,
      lat,
      lng,
      device,
      isOutOfRange
    }
  });

  res.status(201).json({ success: true, data: record });
};

export const checkOut = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const id = req.params.id as string;

  if (!userId || !id) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  const record = await prisma.staffAttendance.findUnique({
    where: { id }
  });

  if (!record || record.userId !== userId) {
    return res.status(404).json({ success: false, error: 'Record not found' });
  }

  if (record.checkOut) {
    return res.status(400).json({ success: false, error: 'Already checked out' });
  }

  const updated = await prisma.staffAttendance.update({
    where: { id },
    data: { checkOut: new Date() }
  });

  res.json({ success: true, data: updated });
};

export const getMyRecords = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const records = await prisma.staffAttendance.findMany({
    where: { userId },
    include: { location: { select: { name: true } } },
    orderBy: { checkIn: 'desc' },
    take: 50
  });

  res.json({ success: true, data: records });
};

export const getRecords = async (req: Request, res: Response) => {
  const { locationId, userId, startDate, endDate, isOutOfRange } = req.query;

  const where: any = {};
  if (locationId) where.locationId = String(locationId);
  if (userId) where.userId = String(userId);
  if (isOutOfRange === 'true') where.isOutOfRange = true;

  if (startDate || endDate) {
    where.checkIn = {};
    if (startDate) where.checkIn.gte = new Date(String(startDate));
    if (endDate) {
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      where.checkIn.lte = end;
    }
  }

  const records = await prisma.staffAttendance.findMany({
    where,
    include: {
      location: { select: { name: true } },
      user: { select: { name: true, email: true } }
    },
    orderBy: { checkIn: 'desc' },
    take: 100
  });

  res.json({ success: true, data: records });
};
