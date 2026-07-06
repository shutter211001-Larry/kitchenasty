import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/db.js';
import { auditLog } from '../lib/audit.js';

// ============================================================
// LIST PAYROLL PERIODS
// ============================================================

export async function listPayrollPeriods(req: Request, res: Response): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
  const locationId = req.query.locationId as string | undefined;

  const where: any = {};
  if (locationId) {
    where.locationId = locationId;
  }

  const [periods, total] = await Promise.all([
    prisma.payrollPeriod.findMany({
      where,
      orderBy: { startDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: { select: { payslips: true } }
      }
    }),
    prisma.payrollPeriod.count({ where }),
  ]);

  res.json({
    success: true,
    data: periods,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ============================================================
// GET PAYROLL PERIOD
// ============================================================

export async function getPayrollPeriod(req: Request<{ id: string }>, res: Response): Promise<void> {
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: req.params.id },
    include: {
      _count: { select: { payslips: true } }
    }
  });

  if (!period) {
    res.status(404).json({ success: false, error: 'Payroll period not found' });
    return;
  }

  res.json({ success: true, data: period });
}

// ============================================================
// CREATE PAYROLL PERIOD
// ============================================================

const createPeriodSchema = z.object({
  locationId: z.string().min(1),
  name: z.string().min(1),
  startDate: z.string(), // ISO Date string
  endDate: z.string(),
});

export async function createPayrollPeriod(req: Request, res: Response): Promise<void> {
  const parsed = createPeriodSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.errors });
    return;
  }

  const { locationId, name, startDate, endDate } = parsed.data;

  // Ensure dates are valid
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    res.status(400).json({ success: false, error: 'Invalid date format' });
    return;
  }

  const period = await prisma.payrollPeriod.create({
    data: {
      locationId,
      name,
      startDate: start,
      endDate: end,
      status: 'DRAFT'
    }
  });

  auditLog(req, { action: 'create', entity: 'PayrollPeriod', entityId: period.id, details: { name, startDate, endDate } });

  res.status(201).json({ success: true, data: period });
}

// ============================================================
// GENERATE PAYSLIPS (Core Logic)
// ============================================================

export async function generatePayslips(req: Request<{ id: string }>, res: Response): Promise<void> {
  const periodId = req.params.id;
  
  const period = await prisma.payrollPeriod.findUnique({
    where: { id: periodId },
    include: { location: true }
  });

  if (!period) {
    res.status(404).json({ success: false, error: 'Payroll period not found' });
    return;
  }

  if (period.status === 'PAID') {
    res.status(400).json({ success: false, error: 'Cannot regenerate a paid payroll period' });
    return;
  }

  // 1. Fetch all active users for this location who have an employment record
  const users = await prisma.user.findMany({
    where: {
      locationId: period.locationId,
      // Need to include terminated staff if their termination date was after the period start date, but for simplicity, let's fetch all who might have worked
    },
    include: {
      insuranceProfile: true,
      employmentRecord: true,
      attendances: {
        where: {
          checkIn: { gte: period.startDate },
          // Using < (endDate + 1 day) might be safer, but let's stick to simple boundary for now
        }
      }
    }
  });

  // Filter users who actually have attendance records during this period OR a monthly salary
  const eligibleUsers = users.filter(u => 
    u.attendances.length > 0 || (u.salaryType === 'MONTHLY' && u.isActive)
  );

  // 2. Clear existing drafted payslips for this period
  await prisma.payslip.deleteMany({
    where: { payrollPeriodId: periodId, status: 'DRAFT' }
  });

  const createdPayslips = [];

  // 3. Calculate payslip for each user
  for (const user of eligibleUsers) {
    let baseSalary = 0;
    let totalOvertime = 0;
    const totalAllowances = 0;
    let totalDeductions = 0;
    
    const items: any[] = [];

    if (user.salaryType === 'HOURLY') {
      // Calculate total hours from attendances
      let totalHours = 0;
      for (const att of user.attendances) {
        if (att.checkIn && att.checkOut) {
          const hours = (att.checkOut.getTime() - att.checkIn.getTime()) / (1000 * 60 * 60);
          totalHours += hours;
        }
      }
      baseSalary = totalHours * user.hourlyWage;
      
      items.push({
        name: 'Basic Hourly Pay',
        type: 'BASE_PAY',
        amount: baseSalary
      });

    } else if (user.salaryType === 'MONTHLY') {
      baseSalary = user.monthlyWage;
      
      items.push({
        name: 'Basic Monthly Pay',
        type: 'BASE_PAY',
        amount: baseSalary
      });
    }

    // Deductions: Labor & Health Insurance
    if (user.insuranceProfile) {
      // Very simplified example of Taiwan labor/health insurance logic
      // In a real system, you cross-reference the official brackets table
      const laborIns = user.insuranceProfile.laborInsuranceBracket * 0.025; // Dummy 2.5% rate
      const healthIns = user.insuranceProfile.healthInsuranceBracket * 0.015 * (1 + user.insuranceProfile.dependents); // Dummy rate
      const pension = (user.insuranceProfile.pensionEmployee / 100) * user.insuranceProfile.laborInsuranceBracket;

      if (laborIns > 0) {
        items.push({ name: 'Labor Insurance (Employee)', type: 'DEDUCTION', amount: laborIns });
        totalDeductions += laborIns;
      }
      if (healthIns > 0) {
        items.push({ name: 'Health Insurance (Employee)', type: 'DEDUCTION', amount: healthIns });
        totalDeductions += healthIns;
      }
      if (pension > 0) {
        items.push({ name: 'Labor Pension (Self)', type: 'DEDUCTION', amount: pension });
        totalDeductions += pension;
      }
    }

    const netPay = baseSalary + totalOvertime + totalAllowances - totalDeductions;

    // Create Payslip
    const payslip = await prisma.payslip.create({
      data: {
        payrollPeriodId: periodId,
        userId: user.id,
        baseSalary,
        totalOvertime,
        totalAllowances,
        totalDeductions,
        netPay,
        status: 'DRAFT',
        items: {
          create: items.map(item => ({
            name: item.name,
            type: item.type,
            amount: item.amount
          }))
        }
      }
    });

    createdPayslips.push(payslip);
  }

  // Mark period as PUBLISHED or keep as DRAFT
  // For now, leave as DRAFT so admin can review

  auditLog(req, { action: 'update', entity: 'PayrollPeriod', entityId: periodId, details: { generatedCount: createdPayslips.length } });

  res.json({ success: true, data: { message: 'Payslips generated', count: createdPayslips.length } });
}

// ============================================================
// GET PAYSLIPS FOR A PERIOD
// ============================================================

export async function getPayslips(req: Request<{ id: string }>, res: Response): Promise<void> {
  const payslips = await prisma.payslip.findMany({
    where: { payrollPeriodId: req.params.id },
    include: {
      user: {
        select: { id: true, name: true, role: true, email: true }
      },
      items: true
    },
    orderBy: { user: { name: 'asc' } }
  });

  res.json({ success: true, data: payslips });
}

// ============================================================
// GET INDIVIDUAL PAYSLIP
// ============================================================

export async function getPayslip(req: Request<{ id: string }>, res: Response): Promise<void> {
  const payslip = await prisma.payslip.findUnique({
    where: { id: req.params.id },
    include: {
      user: {
        select: { id: true, name: true, role: true, email: true, insuranceProfile: true, employmentRecord: true }
      },
      payrollPeriod: true,
      items: true
    }
  });

  if (!payslip) {
    res.status(404).json({ success: false, error: 'Payslip not found' });
    return;
  }

  res.json({ success: true, data: payslip });
}
