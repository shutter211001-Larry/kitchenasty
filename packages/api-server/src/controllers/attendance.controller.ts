import { Request, Response } from 'express';
import { isNationalHoliday } from '../utils/holidays.js';
import prisma from '../lib/db.js';
import jwt from 'jsonwebtoken';

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

export const getQrToken = async (req: Request, res: Response) => {
  const { locationId } = req.query;
  if (!locationId) {
    return res.status(400).json({ success: false, error: 'Missing locationId' });
  }

  try {
    const token = jwt.sign(
      { locationId, type: 'attendance_qr' },
      process.env.JWT_SECRET || 'super-secret',
      { expiresIn: '30s' }
    );
    res.json({ success: true, data: { token } });
  } catch (error) {
    console.error('Error generating QR token:', error);
    res.status(500).json({ success: false, error: 'Failed to generate token' });
  }
};

export const checkIn = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { locationId, lat, lng, device, qrToken } = req.body;

  let finalLocationId = locationId;
  let isOutOfRange = false;
  let isQR = false;

  if (qrToken) {
    try {
      const decoded = jwt.verify(qrToken, process.env.JWT_SECRET || 'super-secret') as any;
      if (decoded.type === 'attendance_qr' && decoded.locationId) {
        finalLocationId = decoded.locationId;
        isOutOfRange = false;
        isQR = true;
      } else {
        return res.status(400).json({ success: false, error: 'Invalid QR token' });
      }
    } catch (err) {
      return res.status(400).json({ success: false, error: 'Invalid or expired QR token' });
    }
  }

  if (!userId || !finalLocationId) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }

  if (!qrToken && (lat === undefined || lng === undefined)) {
    return res.status(400).json({ success: false, error: 'Missing location data for GPS check-in' });
  }

  const location = await prisma.location.findUnique({
    where: { id: finalLocationId }
  });

  if (!location) {
    return res.status(404).json({ success: false, error: 'Location not found' });
  }

  if (!qrToken && location.lat && location.lng && lat !== undefined && lng !== undefined) {
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
      locationId: finalLocationId,
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
      locationId: finalLocationId,
      lat: lat ?? null,
      lng: lng ?? null,
      device: isQR ? `${device || 'Unknown'} (QR Scan)` : device,
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
  
  // Restrict MANAGER to their own location
  if (req.user?.role === 'MANAGER') {
    const manager = await prisma.user.findUnique({ where: { id: req.user.id }});
    if (manager?.locationId) {
      where.locationId = manager.locationId;
    } else {
      where.locationId = 'unassigned-location';
    }
  } else if (locationId) {
    where.locationId = String(locationId);
  }

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

export const getPayroll = async (req: Request, res: Response) => {
  const { year, month } = req.query;

  if (!year || !month) {
    return res.status(400).json({ success: false, error: 'Missing year or month' });
  }

  const startDate = new Date(Number(year), Number(month) - 1, 1);
  const endDate = new Date(Number(year), Number(month), 0, 23, 59, 59, 999);

  const where: any = { isActive: true };
  if (req.user?.role === 'MANAGER') {
    const manager = await prisma.user.findUnique({ where: { id: req.user.id }});
    if (manager?.locationId) {
      where.locationId = manager.locationId;
    } else {
      where.locationId = 'unassigned-location';
    }
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      location: true,
      leaves: {
        where: {
          status: 'APPROVED',
          startTime: { gte: startDate },
          endTime: { lte: endDate }
        }
      },
      attendances: {
        where: {
          checkIn: { gte: startDate, lte: endDate },
          checkOut: { not: null }
        }
      },
      shifts: {
        where: {
          date: { gte: startDate, lte: endDate }
        }
      }
    }
  });

  const payrollData = [];

  for (const user of users) {
    let totalHours = 0;
    let baseSalary = 0;
    let holidayOvertimePay = 0;
    let restDayOvertimePay = 0;
    let regularDayOvertimePay = 0;
    let dailyOvertimePay = 0;
    let leaveDeduction = 0;
    
    const loc = user.location;
    const hourlyRate = user.salaryType === 'HOURLY' ? user.hourlyWage : user.monthlyWage / 240;

    for (const record of user.attendances) {
      if (!record.checkOut) continue;
      const durationMs = record.checkOut.getTime() - record.checkIn.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      
      const recordDate = new Date(record.checkIn);
      recordDate.setHours(0, 0, 0, 0);
      
      const shift = user.shifts.find(s => s.date.getTime() === recordDate.getTime());
      let dayType = shift?.dayType || 'WORKDAY';
      
      const isHoliday = await isNationalHoliday(record.checkIn);
      if (isHoliday) dayType = 'NATIONAL_HOLIDAY';
      
      totalHours += durationHours;

      if (dayType === 'NATIONAL_HOLIDAY') {
        const mult = loc?.hourlyNationalHolidayMultiplier ?? 2.0;
        if (user.salaryType === 'HOURLY' || (loc?.monthlyNationalHolidayOvertime ?? true)) {
          holidayOvertimePay += durationHours * hourlyRate * (mult - 1);
        }
      } else if (dayType === 'REST_DAY') {
        const mult = loc?.restDayMultiplier ?? 1.34;
        restDayOvertimePay += durationHours * hourlyRate * (mult - 1);
      } else if (dayType === 'REGULAR_OFF') {
        const mult = loc?.regularDayMultiplier ?? 2.0;
        regularDayOvertimePay += durationHours * hourlyRate * (mult - 1);
      } else {
        // WORKDAY Daily Overtime
        if (loc?.enableOvertimePay && durationHours > 8) {
          const mult1 = loc?.overtimeMultiplier1 ?? 1.34;
          const mult2 = loc?.overtimeMultiplier2 ?? 1.67;
          
          let ot1Hours = Math.min(2, durationHours - 8);
          let ot2Hours = Math.max(0, durationHours - 10);
          
          dailyOvertimePay += (ot1Hours * hourlyRate * (mult1 - 1)) + (ot2Hours * hourlyRate * (mult2 - 1));
        }
      }
    }

    if (user.salaryType === 'HOURLY') {
      baseSalary = totalHours * user.hourlyWage;
    } else {
      baseSalary = user.monthlyWage;
      
      const minuteRate = hourlyRate / 60;
      
      for (const leave of user.leaves) {
        const durationMinutes = (leave.endTime.getTime() - leave.startTime.getTime()) / (1000 * 60);
        let deductionRatio = 0;
        if (leave.leaveType === 'PERSONAL') deductionRatio = 1.0;
        else if (leave.leaveType === 'SICK') deductionRatio = 0.5;
        
        leaveDeduction += durationMinutes * minuteRate * deductionRatio;
      }
    }

    const totalSalary = Math.round(baseSalary + holidayOvertimePay + restDayOvertimePay + regularDayOvertimePay + dailyOvertimePay - leaveDeduction);

    if (totalHours > 0 || user.salaryType === 'MONTHLY') {
      payrollData.push({
        userId: user.id,
        name: user.name,
        salaryType: user.salaryType,
        hourlyWage: user.hourlyWage,
        monthlyWage: user.monthlyWage,
        totalHours: Number(totalHours.toFixed(2)),
        baseSalary: Math.round(baseSalary),
        holidayOvertimePay: Math.round(holidayOvertimePay),
        restDayOvertimePay: Math.round(restDayOvertimePay),
        regularDayOvertimePay: Math.round(regularDayOvertimePay),
        dailyOvertimePay: Math.round(dailyOvertimePay),
        leaveDeduction: Math.round(leaveDeduction),
        totalSalary
      });
    }
  }

  res.json({ success: true, data: payrollData });
};

export const createCorrectionRequest = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  const { attendanceId, requestedCheckIn, requestedCheckOut, reason } = req.body;

  if (!reason) {
    return res.status(400).json({ success: false, error: 'Reason is required' });
  }

  try {
    const request = await prisma.attendanceCorrectionRequest.create({
      data: {
        userId,
        attendanceId: attendanceId || null,
        requestedCheckIn: requestedCheckIn ? new Date(requestedCheckIn) : null,
        requestedCheckOut: requestedCheckOut ? new Date(requestedCheckOut) : null,
        reason
      }
    });
    res.status(201).json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create request' });
  }
};

export const getMyCorrectionRequests = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

  try {
    const requests = await prisma.attendanceCorrectionRequest.findMany({
      where: { userId },
      include: {
        attendance: true,
        manager: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
};

export const getCorrectionRequests = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) {
      where.status = status as any;
    }

    if (req.user?.role === 'MANAGER') {
      const manager = await prisma.user.findUnique({ where: { id: req.user.id }});
      if (manager?.locationId) {
        where.user = { locationId: manager.locationId };
      } else {
        where.user = { locationId: 'unassigned-location' };
      }
    }

    const requests = await prisma.attendanceCorrectionRequest.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        attendance: true,
        manager: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
};

export const updateCorrectionRequestStatus = async (req: Request, res: Response) => {
  const managerId = req.user?.id;
  const { id } = req.params;
  const { status, locationId } = req.body; // locationId is needed if creating a new attendance record

  if (!managerId) return res.status(401).json({ success: false, error: 'Unauthorized' });
  if (!['APPROVED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid status' });
  }

  try {
    const request = await prisma.attendanceCorrectionRequest.findUnique({
      where: { id: String(id) }
    });

    if (!request) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: 'Request is already processed' });
    }

    const updatedRequest = await prisma.attendanceCorrectionRequest.update({
      where: { id: String(id) },
      data: {
        status: status as any,
        managerId
      }
    });

    if (status === 'APPROVED') {
      if (request.attendanceId) {
        // Update existing attendance
        const updateData: any = {};
        if (request.requestedCheckIn) updateData.checkIn = request.requestedCheckIn;
        if (request.requestedCheckOut) updateData.checkOut = request.requestedCheckOut;
        
        await prisma.staffAttendance.update({
          where: { id: request.attendanceId },
          data: updateData
        });
      } else {
        // Create new attendance
        if (!request.requestedCheckIn) {
           return res.status(400).json({ success: false, error: 'Cannot create attendance without check-in time' });
        }
        await prisma.staffAttendance.create({
          data: {
            userId: request.userId,
            locationId: locationId || null,
            checkIn: request.requestedCheckIn,
            checkOut: request.requestedCheckOut,
            device: 'Manual Correction',
            isOutOfRange: false
          }
        });
      }
    }

    res.json({ success: true, data: updatedRequest });
  } catch (error) {
    console.error('Error updating correction request:', error);
    res.status(500).json({ success: false, error: 'Failed to update request' });
  }
};
