import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pizza-master-jwt-secret-key-super-secure';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '電子郵件與密碼為必填項目' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: '此電子郵件已被註冊使用' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        role: role === 'ADMIN' ? 'ADMIN' : 'STAFF'
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Registration failed', error);
    res.status(500).json({ error: '註冊帳號失敗', details: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '電子郵件與密碼為必填項目' });
    }

    // Auto-seed default administrator if the user table is empty
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('Seeding default administrator admin@pizzamaster.com / admin123...');
      const adminHash = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: 'admin@pizzamaster.com',
          name: '系統管理員',
          passwordHash: adminHash,
          role: 'ADMIN'
        }
      });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: '電子郵件或密碼不正確' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '電子郵件或密碼不正確' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error('Login failed', error);
    res.status(500).json({ error: '登入失敗', details: error.message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: '使用者未驗證' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: '使用者不存在' });
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });
  } catch (error: any) {
    console.error('Fetch user failed', error);
    res.status(500).json({ error: '獲取使用者資料失敗' });
  }
};

export const getSetupStatus = async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    res.json({ hasUsers: userCount > 0 });
  } catch (error) {
    res.status(500).json({ error: '獲取系統初始化狀態失敗' });
  }
};
