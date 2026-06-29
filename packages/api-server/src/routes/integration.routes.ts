import { Router } from 'express';
import prisma from '../lib/db.js';

const router = Router();

// Middleware to check integration key
const authenticateIntegration = (req: any, res: any, next: any) => {
  const authKey = req.headers['x-integration-key'];
  const expectedKey = process.env.INTEGRATION_KEY || 'pizzamaster-integration-secret-key';
  
  if (!authKey || authKey !== expectedKey) {
    return res.status(401).json({ success: false, error: 'Unauthorized integration request' });
  }
  next();
};

router.use(authenticateIntegration);

// 1. Get all menu items with category details
router.get('/menu-items', async (req, res) => {
  try {
    const items = await prisma.menuItem.findMany({
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });
    
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get recent orders with their items
router.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      take: 100,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        items: {
          include: {
            menuItem: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        customer: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });
    
    res.json({ success: true, data: orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get upcoming reservations
router.get('/reservations', async (req, res) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: {
        date: {
          gte: new Date(new Date().setHours(0,0,0,0)) // starting from today
        },
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      orderBy: {
        date: 'asc'
      },
      include: {
        customer: {
          select: {
            name: true,
            phone: true
          }
        },
        location: {
          select: {
            name: true
          }
        }
      }
    });
    
    res.json({ success: true, data: reservations });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
