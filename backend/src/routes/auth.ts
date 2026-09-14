import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import prisma from '../utils/prisma';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { assignUserVirtualNumber, initializeNumberPool } from '../services/numberService';

const router = Router();

const signupSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  password: z.string().min(8).max(100)
});

const loginSchema = z.object({
  virtualNumber: z.string().regex(/^\d{3}-\d{3}-\d{4}$/),
  password: z.string().min(1)
});

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { displayName, password } = signupSchema.parse(req.body);

    // Check if we need to initialize the number pool
    await initializeNumberPool();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const userId = uuid();
    const updatedUser = await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: userId,
          virtualNumber: `pending-${userId}`,
          displayName: displayName || null,
          passwordHash,
        },
      });
      const virtualNumber = await assignUserVirtualNumber(tx, userId);
      return tx.user.update({
        where: { id: userId },
        data: { virtualNumber },
      });
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: updatedUser.id,
      virtualNumber: updatedUser.virtualNumber
    });

    const refreshToken = generateRefreshToken({
      userId: updatedUser.id,
      virtualNumber: updatedUser.virtualNumber
    });

    // Store refresh token
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await prisma.session.create({
      data: {
        userId: updatedUser.id,
        refreshTokenHash,
        deviceId: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: updatedUser.id,
        action: 'signup',
        metadata: { virtualNumber: updatedUser.virtualNumber },
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      user: {
        id: updatedUser.id,
        virtualNumber: updatedUser.virtualNumber,
        displayName: updatedUser.displayName
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clerk Sync
router.post('/clerk-sync', async (req, res) => {
  try {
    const { clerkId, displayName } = req.body;
    
    if (!clerkId) {
      return res.status(400).json({ error: 'clerkId is required' });
    }

    let user = await prisma.user.findUnique({
      where: { id: clerkId }
    });

    if (!user) {
      // Check if we need to initialize the number pool
      await initializeNumberPool();

      user = await prisma.$transaction(async (tx) => {
        await tx.user.create({
          data: {
            id: clerkId,
            virtualNumber: `pending-${clerkId}`,
            displayName: displayName || null,
            passwordHash: 'CLERK_AUTH',
          },
        });
        const virtualNumber = await assignUserVirtualNumber(tx, clerkId);
        return tx.user.update({
          where: { id: clerkId },
          data: { virtualNumber },
        });
      });
      
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'clerk_signup',
          metadata: { virtualNumber: user.virtualNumber },
          ipAddress: req.ip
        }
      });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      virtualNumber: user.virtualNumber
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      virtualNumber: user.virtualNumber
    });

    // Store refresh token
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        deviceId: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    res.json({
      user: {
        id: user.id,
        virtualNumber: user.virtualNumber,
        displayName: user.displayName
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Clerk sync error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { virtualNumber, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { virtualNumber }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      virtualNumber: user.virtualNumber
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
      virtualNumber: user.virtualNumber
    });

    // Store refresh token
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        deviceId: req.headers['user-agent'] || 'unknown',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        ipAddress: req.ip
      }
    });

    res.json({
      user: {
        id: user.id,
        virtualNumber: user.virtualNumber,
        displayName: user.displayName
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }

    const payload = JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64').toString());
    
    const sessions = await prisma.session.findMany({
      where: {
        userId: payload.userId,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    let validSession = null;
    for (const session of sessions) {
      if (await bcrypt.compare(refreshToken, session.refreshTokenHash)) {
        validSession = session;
        break;
      }
    }

    if (!validSession) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    });

    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: 'User not active' });
    }

    const newAccessToken = generateAccessToken({
      userId: user.id,
      virtualNumber: user.virtualNumber
    });

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout
router.post('/logout', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      const payload = JSON.parse(Buffer.from(refreshToken.split('.')[1], 'base64').toString());
      await prisma.session.updateMany({
        where: {
          userId: payload.userId,
          revokedAt: null
        },
        data: { revokedAt: new Date() }
      });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
