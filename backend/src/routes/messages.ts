import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

const sendMessageSchema = z.object({
  toVirtualNumber: z.string().regex(/^\d{3}-\d{3}-\d{4}$/),
  body: z.string().min(1).max(5000)
});

// Send a message (creates connection if it doesn't exist)
router.post('/', authenticate, async (req, res) => {
  try {
    const { toVirtualNumber, body } = sendMessageSchema.parse(req.body);

    // Find recipient
    const recipient = await prisma.user.findUnique({
      where: { virtualNumber: toVirtualNumber }
    });

    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    if (recipient.id === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot message yourself' });
    }

    // Check if blocked
    const blockedConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userIdA: req.user!.userId, userIdB: recipient.id, status: 'blocked' },
          { userIdA: recipient.id, userIdB: req.user!.userId, status: 'blocked' }
        ]
      }
    });

    if (blockedConnection) {
      return res.status(403).json({ error: 'Cannot message blocked user' });
    }

    const message = await prisma.$transaction(async (tx) => {
      const [userIdA, userIdB] = [req.user!.userId, recipient.id].sort();
      let connection = await tx.connection.findUnique({
        where: { userIdA_userIdB: { userIdA, userIdB } },
      });

      if (!connection) {
        connection = await tx.connection.create({
          data: { userIdA, userIdB, status: 'pending', requestedBy: req.user!.userId },
        });
      } else if (connection.status === 'pending' && connection.requestedBy !== req.user!.userId) {
        connection = await tx.connection.update({
          where: { id: connection.id },
          data: { status: 'active' },
        });
      } else if (connection.status === 'removed') {
        connection = await tx.connection.update({
          where: { id: connection.id },
          data: { status: 'pending', requestedBy: req.user!.userId },
        });
      }

      return tx.message.create({
        data: { connectionId: connection.id, senderId: req.user!.userId, body },
        include: {
          sender: { select: { id: true, virtualNumber: true, displayName: true } },
        },
      });
    });

    res.status(201).json(message);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get messages for a connection
router.get('/connection/:connectionId', authenticate, async (req, res) => {
  try {
    const { connectionId } = req.params;

    const connection = await prisma.connection.findUnique({
      where: { id: connectionId }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    if (connection.userIdA !== req.user!.userId && connection.userIdB !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const messages = await prisma.message.findMany({
      where: { connectionId },
      include: {
        sender: {
          select: {
            id: true,
            virtualNumber: true,
            displayName: true
          }
        }
      },
      orderBy: { sentAt: 'asc' }
    });

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Mark message as read
router.patch('/:id/read', authenticate, async (req, res) => {
  try {
    const message = await prisma.message.findUnique({
      where: { id: req.params.id },
      include: { connection: true }
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.connection.userIdA !== req.user!.userId && 
        message.connection.userIdB !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (message.senderId === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot mark own message as read' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id: req.params.id },
      data: { readAt: new Date() }
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
