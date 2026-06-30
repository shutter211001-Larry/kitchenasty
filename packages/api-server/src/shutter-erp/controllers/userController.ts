import { Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../lib/prisma.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { sendEmail, staffInvitationEmail } from '../../lib/email.js';

export const getUsers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users', error);
    res.status(500).json({ error: '獲取使用者帳號清單失敗' });
  }
};

export const inviteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ error: '電子郵件為必填欄位' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: '此電子郵件已被註冊使用' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invite = await prisma.inviteToken.create({
      data: {
        token,
        email,
        role: role === 'ADMIN' ? 'ADMIN' : 'STAFF',
        invitedBy: req.user!.id,
        expiresAt,
      },
    });

    const erpUrl = process.env.ERP_URL_PUBLIC || process.env.ERP_URL || 'http://localhost:3000';
    const inviteLink = `${erpUrl.replace(/\/+$/, '')}/accept-invite?token=${token}`;
    
    const emailContent = staffInvitationEmail({ email, role: invite.role, inviteLink });
    await sendEmail({ to: email, ...emailContent });

    res.status(201).json({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
    });
  } catch (error: any) {
    console.error('Failed to invite user', error);
    res.status(500).json({ error: '發送邀請失敗', details: error.message });
  }
};

export const updateUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, role, password } = req.body;

    if (!name || !role) {
      return res.status(400).json({ error: '姓名與權限角色為必填欄位' });
    }

    // Safety: Prevent active user from changing their own role to prevent administrative lockout
    if (id === req.user?.id && role !== 'ADMIN') {
      const activeUser = await prisma.user.findUnique({ where: { id } });
      if (activeUser?.role === 'ADMIN') {
        return res.status(400).json({ error: '安全保護：系統管理員不能變更自己為一般員工權限' });
      }
    }

    const updateData: any = {
      name,
      role: role === 'ADMIN' ? 'ADMIN' : 'STAFF'
    };

    // If password is provided, re-hash and update password
    if (password && password.trim() !== '') {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      }
    });

    res.json(user);
  } catch (error: any) {
    console.error('Failed to update user', error);
    res.status(500).json({ error: '更新帳號失敗' });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const id = req.params.id as string;

    // Safety: Prevent active admin from deleting themselves
    if (id === req.user?.id) {
      return res.status(400).json({ error: '安全保護：您不能刪除自己目前正在使用的帳號' });
    }

    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Failed to delete user', error);
    res.status(500).json({ error: '刪除帳號失敗' });
  }
};
