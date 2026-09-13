import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  profilePhotoUrl: z.string().url().optional()
});

// Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        virtualNumber: true,
        displayName: true,
        profilePhotoUrl: true,
        status: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile
router.patch('/me', authenticate, async (req, res) => {
  try {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data,
      select: {
        id: true,
        virtualNumber: true,
        displayName: true,
        profilePhotoUrl: true,
        status: true
      }
    });

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user by virtual number (public info only)
router.get('/:virtualNumber', authenticate, async (req, res) => {
  try {
    const { virtualNumber } = req.params;

    const user = await prisma.user.findUnique({
      where: { virtualNumber },
      select: {
        id: true,
        virtualNumber: true,
        displayName: true,
        status: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if users are connected
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userIdA: req.user!.userId, userIdB: user.id },
          { userIdA: user.id, userIdB: req.user!.userId }
        ],
        status: 'active'
      }
    });

    // Only return public info unless connected
    if (!connection) {
      return res.json({
        id: user.id,
        virtualNumber: user.virtualNumber,
        displayName: user.displayName
      });
    }

    // Return full profile if connected
    res.json(user);
  } catch (error) {
    console.error('Get user by number error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
