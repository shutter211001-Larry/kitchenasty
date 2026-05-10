import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as FacebookStrategy } from 'passport-facebook';
import prisma from './db.js';

export function initPassport() {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_LOGIN_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_LOGIN_CLIENT_SECRET;
  const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID;
  const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;
  const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: GOOGLE_CLIENT_ID,
          clientSecret: GOOGLE_CLIENT_SECRET,
          callbackURL: `${BASE_URL}/api/auth/google/callback`,
          passReqToCallback: true,
        },
        async (req, _accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('No email in Google profile'));

            const loggedInUser = (req as any).user;

            if (loggedInUser && loggedInUser.type === 'customer') {
            // LINKING: User is already logged in
            if (loggedInUser) {
              // 1. Check if this Google account is already linked to ANOTHER customer
              const existingLink = await prisma.customer.findUnique({
                where: { googleId: profile.id }
              });

              if (existingLink && existingLink.id !== loggedInUser.id) {
                // This Google account is already taken by someone else
                return done(null, false, { message: '此 Google 帳號已被其他會員連結，請先解除該帳號的連結。' });
              }

              // 2. Safe to link
              const customer = await prisma.customer.update({
                where: { id: loggedInUser.id },
                data: {
                  googleId: profile.id,
                  googleEmail: email,
                },
              });
              return done(null, { id: customer.id, email: customer.email, type: 'customer' as const });
            }

            // LOGIN/REGISTER: Try to find by googleId first, then by email
            let customer = await prisma.customer.findFirst({
              where: {
                OR: [
                  { googleId: profile.id },
                  { email: email }
                ]
              }
            });

            if (!customer) {
              customer = await prisma.customer.create({
                data: {
                  email,
                  name: profile.displayName || email,
                  password: null,
                  googleId: profile.id,
                  googleEmail: email,
                  isGuest: false,
                },
              });
            } else {
              // Update googleId and convert guest if needed
              customer = await prisma.customer.update({
                where: { id: customer.id },
                data: {
                  googleId: customer.googleId || profile.id,
                  googleEmail: customer.googleEmail || email,
                  isGuest: false,
                  name: customer.name || profile.displayName || email,
                },
              });
            }

            // Link guest orders
            await prisma.order.updateMany({
              where: { guestEmail: email, customerId: null },
              data: { customerId: customer.id },
            });

            done(null, { id: customer.id, email: customer.email, type: 'customer' as const });
          } catch (err) {
            done(err as Error);
          }
        }
      )
    );
  }

  if (FACEBOOK_APP_ID && FACEBOOK_APP_SECRET) {
    passport.use(
      new FacebookStrategy(
        {
          clientID: FACEBOOK_APP_ID,
          clientSecret: FACEBOOK_APP_SECRET,
          callbackURL: `${BASE_URL}/api/auth/facebook/callback`,
          profileFields: ['id', 'emails', 'name', 'displayName'],
        },
        async (_accessToken: string, _refreshToken: string, profile: any, done: any) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('No email in Facebook profile'));

            let customer = await prisma.customer.findUnique({ where: { email } });
            if (!customer) {
              customer = await prisma.customer.create({
                data: {
                  email,
                  name: profile.displayName || email,
                  password: null,
                },
              });
            }
            done(null, { id: customer.id, email: customer.email, type: 'customer' as const });
          } catch (err) {
            done(err as Error);
          }
        }
      )
    );
  }

  return passport;
}
