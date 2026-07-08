import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { sendEmail, passwordResetEmail, erpInviteEmail } from '../../lib/email.js';

const JWT_SECRET = process.env.JWT_SECRET || 'pizza-master-jwt-secret-key-super-secure';

export const register = async (req: Request, res: Response) => {
  res.status(403).json({ error: '註冊已停用，請由 SaaS 總部建立帳號。' });
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '電子郵件與密碼為必填項目' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { tenant: true }
    });

    if (!user) {
      return res.status(401).json({ error: '電子郵件或密碼不正確' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '電子郵件或密碼不正確' });
    }

    // Check ERP Add-on Permission
    if (user.role !== 'SUPER_ADMIN' && (!user.tenant || !user.tenant.hasErpAccess)) {
      return res.status(403).json({ error: 'SaaS 總部尚未為您開通 ERP 模組權限，請先聯絡總部升級解鎖。' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
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
      role: user.role,
      tenantId: user.tenantId
    });
  } catch (error: any) {
    console.error('Fetch user failed', error);
    res.status(500).json({ error: '獲取使用者資料失敗' });
  }
};

export const getSetupStatus = async (req: Request, res: Response) => {
  res.json({ hasSuperAdmin: true }); // Always true for ERP now
};

export const updateLanguage = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { language } = req.body;
    if (!req.user) {
      return res.status(401).json({ error: '使用者未驗證' });
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

export const inviteUser = async (req: AuthenticatedRequest, res: Response) => {
  res.status(403).json({ error: '邀請已停用，請由 SaaS 總部邀請。' });
};

export const validateInviteToken = async (req: Request, res: Response) => {
  res.status(403).json({ error: '請使用 SaaS 平台接受邀請' });
};

export const acceptInvite = async (req: Request, res: Response) => {
  res.status(403).json({ error: '請使用 SaaS 平台接受邀請' });
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  res.status(403).json({ error: '請使用 SaaS 平台重置密碼' });
};

export const resetPassword = async (req: Request, res: Response) => {
  res.status(403).json({ error: '請使用 SaaS 平台重置密碼' });
};
