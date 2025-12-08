import { Router } from 'express';
import * as authController from './auth.controller';
import { requireAuth } from './auth.middleware';

export const authRouter = Router();

// Public routes
authRouter.get('/login', authController.getLoginUrl);
authRouter.get('/callback', authController.handleCallback);

// Protected routes
authRouter.get('/me', requireAuth, authController.getCurrentUser);
authRouter.post('/logout', requireAuth, authController.logout);
