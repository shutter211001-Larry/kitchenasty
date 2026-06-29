import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { PrismaClient } from '@prisma/client';
import { grantRegistrationBonus } from './registrationBonus.js';

const prisma = new PrismaClient();

export const initPassport = () => {
  // Google Strategy for Customers
  if (process.env.GOOGLE_LOGIN_CLIENT_ID && process.env.GOOGLE_LOGIN_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_LOGIN_CLIENT_ID,
          clientSecret: process.env.GOOGLE_LOGIN_CLIENT_SECRET,
          callbackURL: `${(process.env.API_URL_PUBLIC || 'http://localhost:3000').replace(/\/$/, '')}/api/auth/google/callback`,
          passReqToCallback: true,
        },
        async (req, accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error('No email found from Google profile'), false);
            }

            // Check if user is logged in AND wants to link (determined by a 'state' or 'prompt' usually, but here we can check for a 'link' flag)
            // Note: We need a way to pass the 'link' intent from frontend to Google and back.
            // For now, let's look at the 'state' if possible, or just be more careful.
            const loggedInUser = (req as any).user;
            const stateStr = req.query.state as string || '';
            const isLinking = stateStr.includes('link=true') || stateStr.includes('"link":true');

            if (loggedInUser && loggedInUser.type === 'customer' && isLinking) {
              // LINKING: User is already logged in and explicitly wants to link
              // 1. Check if this Google account is already linked to ANOTHER customer
              const existingLink = await prisma.customer.findUnique({
                where: { googleId: profile.id }
              });

              if (existingLink && existingLink.id !== loggedInUser.id) {
                // This Google account is already taken by someone else
                return done(null, false, { message: `此 Google 帳號已被其他會員連結|${profile.id}` });
              }

              const existingCustomer = await prisma.customer.findUnique({ where: { id: loggedInUser.id } });
              // 2. Safe to link
              const customer = await prisma.customer.update({
                where: { id: loggedInUser.id },
                data: {
                  googleId: profile.id,
                  googleEmail: email,
                  ...(!existingCustomer?.email ? { email: email } : {})
                },
              });
              return done(null, { id: customer.id, email: customer.email, type: 'customer' as const });
            }

            // LOGIN/REGISTER Flow
            let customer = await prisma.customer.findFirst({
              where: {
                OR: [
                  { googleId: profile.id },
                  { email: email }
                ]
              }
            });

            if (!customer) {
              // Create new customer
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
              // Grant one-time registration bonus (anti-wash protected)
              await grantRegistrationBonus(customer.id, 'google', profile.id);
            } else {
              // Update existing customer's googleId if not set
              customer = await prisma.customer.update({
                where: { id: customer.id },
                data: {
                  googleId: customer.googleId || profile.id,
                  googleEmail: customer.googleEmail || email,
                  ...(!customer.email ? { email: email } : {}),
                  isGuest: false,
                  name: customer.name || profile.displayName || email,
                },
              });
            }

            return done(null, { id: customer.id, email: customer.email, type: 'customer' as const });
          } catch (error) {
            return done(error as Error, false);
          }
        }
      )
    );
  }

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });
};
