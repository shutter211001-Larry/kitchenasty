import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
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

const handleSocialCallback = (req: Request, res: Response) => {
  if (!req.user) return res.redirect(`${STOREFRONT_URL}/auth/callback?error=auth_failed`);
  const user = req.user as any;
  const token = generateToken({
    id: user.id,
    email: user.email,
    type: user.type || 'customer',
  });
  
  // Extract redirect from state if present
  let redirectPath = '/';
  const stateStr = req.query.state as string;
  const directRedirect = req.query.redirectUri || req.query.redirect;

  if (stateStr) {
    try {
      // Some providers or double-encoding might require multiple decodes, 
      // but usually Express decodes once. Let's try to parse as JSON first.
      let stateObj: any = null;
      if (stateStr.startsWith('{')) {
        stateObj = JSON.parse(stateStr);
      } else {
        // Try decoding in case it's double-encoded
        const decoded = decodeURIComponent(stateStr);
        if (decoded.startsWith('{')) {
          stateObj = JSON.parse(decoded);
        } else {
          // Try parsing as query string
          const params = new URLSearchParams(stateStr);
          redirectPath = params.get('redirect') || params.get('redirectUri') || redirectPath;
        }
      }

      if (stateObj) {
        redirectPath = stateObj.redirect || stateObj.redirectUri || redirectPath;
      }
    } catch (e) {
      console.warn('[Auth] Failed to parse OAuth state:', e);
    }
  }

  // Fallback to direct query param if state didn't yield anything
  if (redirectPath === '/' && directRedirect) {
    redirectPath = directRedirect as string;
  }

  // Ensure redirectPath is relative to prevent open redirect vulnerabilities
  if (redirectPath.startsWith('http')) {
    try {
      const url = new URL(redirectPath);
      redirectPath = url.pathname + url.search;
    } catch (e) {
      redirectPath = '/';
    }
  }

  res.redirect(`${STOREFRONT_URL}/auth/callback?token=${token}&redirect=${encodeURIComponent(redirectPath)}`);
};

// Social login — Google
if (process.env.GOOGLE_LOGIN_CLIENT_ID) {
  router.get('/google', (req: Request, res: Response, next: NextFunction) => {
    const state = req.query.state as string || '';
    const prompt = req.query.prompt as string || 'select_account';
    
    passport.authenticate('google', { 
      scope: ['profile', 'email'], 
      session: false,
      state: state,
      prompt: prompt
    })(req, res, next);
  });

  router.get('/google/callback', (req: Request, res: Response, next: NextFunction) => {
    // Extract user token from state if provided
    const stateStr = req.query.state as string;
    if (stateStr) {
      try {
        const decodedStr = decodeURIComponent(stateStr);
        if (decodedStr.startsWith('{')) {
          const stateObj = JSON.parse(decodedStr);
          if (stateObj.token) {
            const payload = jwt.verify(stateObj.token, process.env.JWT_SECRET || 'fallback_secret');
            req.user = payload as Express.User;
          }
        }
      } catch (e) {
        console.error('Failed to parse state token:', e);
      }
    }

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
