import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller.js';
import { authenticate, generateToken } from '../middleware/auth.js';

const router = Router();
const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:5174';

// STAFF AUTH
router.post('/staff/login', authController.staffLogin);
router.post('/staff/register', authController.staffRegister);

// CUSTOMER AUTH
router.post('/customer/register', authController.customerRegister);
router.post('/customer/login', authController.customerLogin);

// Social login callback handler
const handleSocialCallback = (req: Request, res: Response) => {
  if (!req.user) return res.redirect(`${STOREFRONT_URL}/auth/callback?error=auth_failed`);
  
  const user = req.user as any;
  
  // Generate JWT token for the authenticated customer
  const token = generateToken({
    id: user.id,
    email: user.email,
    type: user.type
  });
  
  res.redirect(`${STOREFRONT_URL}/auth/callback?token=${token}`);
};

// Social login — Google
if (process.env.GOOGLE_LOGIN_CLIENT_ID) {
  router.get('/google', (req: Request, res: Response, next: NextFunction) => {
    const state = req.query.state as string || '';
    passport.authenticate('google', { 
      scope: ['profile', 'email'], 
      session: false,
      state: state
    })(req, res, next);
  });

  router.get('/google/callback', (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate('google', { session: false }, (err: any, user: any, info: any) => {
      if (err) {
        console.error('Google Auth Error:', err);
        return res.redirect(`${STOREFRONT_URL}/auth/callback?error=server_error`);
      }
      if (!user) {
        if (info && info.message && info.message.includes('已被其他會員連結')) {
          const socialId = info.message.split('|')[1] || '';
          return res.redirect(`${STOREFRONT_URL}/account?error=conflict&provider=google&socialId=${socialId}&verified=true`);
        }
        return res.redirect(`${STOREFRONT_URL}/auth/callback?error=auth_failed`);
      }
      req.user = user;
      next();
    })(req, res, next);
  }, handleSocialCallback);
}

// SHARED
router.get('/me', authenticate, authController.getMe);
router.delete('/me', authenticate, authController.deleteMe);
router.post('/set-password', authenticate, authController.setPassword);
router.patch('/me', authenticate, authController.updateMe);
router.post('/google/unbind', authenticate, authController.unbindGoogle);
router.post('/social/merge', authenticate, authController.mergeSocialAccount);

export default router;
