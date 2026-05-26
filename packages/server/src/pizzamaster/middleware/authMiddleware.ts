import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pizza-master-jwt-secret-key-super-secure';

export interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user?: {
    id: string;
    email: string;
    role: 'ADMIN' | 'STAFF';
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供驗證 Token，存取被拒' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      email: string;
      role: 'ADMIN' | 'STAFF';
    };

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token 驗證失敗或已過期，請重新登入' });
  }
};

export const requireRole = (role: 'ADMIN' | 'STAFF') => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: '使用者未驗證' });
    }
    
    // ADMIN can do everything; STAFF can only do match
    if (role === 'ADMIN' && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: '權限不足，此作業僅限系統管理員執行' });
    }
    
    next();
  };
};
