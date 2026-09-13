import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

const updateConnectionSchema = z.object({
  status: z.enum(['blocked', 'removed'])
});

// Get all connections for current user
router.get('/', authenticate, async (req, res) => {
  try {
    const connections = await prisma.connection.findMany({
      where: {
        OR: [
          { userIdA: req.user!.userId },
          { userIdB: req.user!.userId }
        ]
      },
      include: {
        userA: {
          select: {
            id: true,
            virtualNumber: true,
            displayName: true,
            profilePhotoUrl: true
          }
        },
        userB: {
          select: {
            id: true,
            virtualNumber: true,
            displayName: true,
            profilePhotoUrl: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Transform to show the other user
    const transformedConnections = connections.map(conn => {
      const isUserA = conn.userIdA === req.user!.userId;
      const otherUser = isUserA ? conn.userB : conn.userA;
      return {
        id: conn.id,
        status: conn.status,
        requestedBy: conn.requestedBy,
        user: otherUser,
        createdAt: conn.createdAt,
        updatedAt: conn.updatedAt
      };
    });

    res.json(transformedConnections);
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific connection
router.get('/:id', authenticate, async (req, res) => {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: req.params.id },
      include: {
        userA: {
          select: {
            id: true,
            virtualNumber: true,
            displayName: true,
            profilePhotoUrl: true
          }
        },
        userB: {
          select: {
            id: true,
            virtualNumber: true,
            displayName: true,
            profilePhotoUrl: true
          }
        }
      }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if (connection.userIdA !== req.user!.userId && connection.userIdB !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const isUserA = connection.userIdA === req.user!.userId;
    const otherUser = isUserA ? connection.userB : connection.userA;

    res.json({
      id: connection.id,
      status: connection.status,
      requestedBy: connection.requestedBy,
      user: otherUser,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    });
  } catch (error) {
    console.error('Get connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update connection status (block/remove)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const { status } = updateConnectionSchema.parse(req.body);

    const connection = await prisma.connection.findUnique({
      where: { id: req.params.id }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if (connection.userIdA !== req.user!.userId && connection.userIdB !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedConnection = await prisma.connection.update({
      where: { id: req.params.id },
      data: { status }
    });

    res.json(updatedConnection);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Update connection error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
