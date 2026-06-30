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
      console.log('Seeding default administrator admin@shutter.com / admin123...');
      const adminHash = await bcrypt.hash('admin123', 10);
      await prisma.user.create({
        data: {
          email: 'admin@shutter.com',
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
    const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
    res.json({ hasSuperAdmin: adminCount > 0 });
  } catch (error) {
    res.status(500).json({ error: '獲取系統初始化狀態失敗' });
  }
};

export const updateLanguage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { language } = req.body;
    if (!req.user) {
      return res.status(401).json({ error: '使用者未驗證' });
    }

    if (!language || typeof language !== 'string') {
      return res.status(400).json({ error: '無效的語言設定' });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { preferredLanguage: language },
    });

    res.json({ success: true, preferredLanguage: user.preferredLanguage });
  } catch (error: any) {
    console.error('Update language failed', error);
    res.status(500).json({ error: '更新語言設定失敗' });
  }
};

export const validateInviteToken = async (req: Request<{ token: string }>, res: Response) => {
  try {
    const invite = await prisma.inviteToken.findUnique({
      where: { token: req.params.token },
    });

    if (!invite) {
      return res.status(404).json({ error: '無效的邀請連結' });
    }

    if (invite.usedAt) {
      return res.status(400).json({ error: '此邀請連結已被使用' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: '此邀請連結已過期' });
    }

    res.json({
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
      },
    });
  } catch (error: any) {
    console.error('Validate invite failed', error);
    res.status(500).json({ error: '驗證邀請失敗' });
  }
};

export const acceptInvite = async (req: Request, res: Response) => {
  try {
    const { token, name, password } = req.body;

    if (!token || !name || !password) {
      return res.status(400).json({ error: '名稱與密碼為必填欄位' });
    }

    const invite = await prisma.inviteToken.findUnique({ where: { token } });
    if (!invite) {
      return res.status(404).json({ error: '無效的邀請連結' });
    }

    if (invite.usedAt) {
      return res.status(400).json({ error: '此邀請連結已被使用' });
    }

    if (invite.expiresAt < new Date()) {
      return res.status(400).json({ error: '此邀請連結已過期' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: invite.email } });
    if (existingUser) {
      return res.status(400).json({ error: '此電子郵件已被註冊使用' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          email: invite.email,
          name,
          passwordHash,
          role: invite.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
        },
      }),
      prisma.inviteToken.update({
        where: { id: invite.id },
        data: { usedAt: new Date() },
      }),
    ]);

    const jwtToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Accept invite failed', error);
    res.status(500).json({ error: '接受邀請失敗' });
  }
};
