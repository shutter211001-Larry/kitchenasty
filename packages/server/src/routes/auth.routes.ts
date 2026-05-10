import { Router } from 'express';
import passport from 'passport';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const STOREFRONT_URL = process.env.STOREFRONT_URL || 'http://localhost:5174';

// STAFF AUTH
router.post('/staff/login', authController.staffLogin);
router.post('/staff/register', authController.staffRegister);

// CUSTOMER AUTH
router.post('/customer/register', authController.customerRegister);
router.post('/customer/login', authController.customerLogin);

// Social login callback handler
const handleSocialCallback = (req: any, res: any) => {
  const token = (req.user as any).token || '';
  res.redirect(`${STOREFRONT_URL}/login/callback?token=${token}`);
};

// Social login — Google
if (process.env.GOOGLE_LOGIN_CLIENT_ID) {
  router.get('/google', (req, res, next) => {
    const state = req.query.state as string || '';
    passport.authenticate('google', { 
      scope: ['profile', 'email'], 
      session: false,
      state: state
    })(req, res, next);
  });
  router.get('/google/callback', (req, res, next) => {
    passport.authenticate('google', { session: false }, (err: any, user: any, info: any) => {
      if (err) return res.redirect(`${STOREFRONT_URL}/login?error=server_error`);
      if (!user) {
        if (info && info.message && info.message.includes('已被其他會員連結')) {
          // In Google OAuth, we don't have the socialId easily here, 
          // but we can tell the frontend to re-initiate or we could have saved it in session.
          // For simplicity, we'll tell the frontend a conflict happened.
          return res.redirect(`${STOREFRONT_URL}/account?error=conflict&provider=google`);
        }
        return res.redirect(`${STOREFRONT_URL}/login?error=auth_failed`);
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
