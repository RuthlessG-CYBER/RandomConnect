import { Router } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

const initiateCallSchema = z.object({
  calleeVirtualNumber: z.string().regex(/^\d{3}-\d{3}-\d{4}$/),
  callType: z.enum(['audio', 'video'])
});

const groupCallSchema = z.object({
  groupId: z.string().uuid(),
  callType: z.enum(['audio', 'video'])
});

const respondCallSchema = z.object({
  accept: z.boolean()
});

// Initiate 1:1 call
router.post('/', authenticate, async (req, res) => {
  try {
    const { calleeVirtualNumber, callType } = initiateCallSchema.parse(req.body);

    // Find callee
    const callee = await prisma.user.findUnique({
      where: { virtualNumber: calleeVirtualNumber }
    });

    if (!callee) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (callee.id === req.user!.userId) {
      return res.status(400).json({ error: 'Cannot call yourself' });
    }

    // Check if users have active connection
    const connection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userIdA: req.user!.userId, userIdB: callee.id },
          { userIdA: callee.id, userIdB: req.user!.userId }
        ],
        status: 'active'
      }
    });

    if (!connection) {
      return res.status(403).json({ error: 'Must have active connection to call' });
    }

    // Check if blocked
    const blockedConnection = await prisma.connection.findFirst({
      where: {
        OR: [
          { userIdA: req.user!.userId, userIdB: callee.id, status: 'blocked' },
          { userIdA: callee.id, userIdB: req.user!.userId, status: 'blocked' }
        ]
      }
    });

    if (blockedConnection) {
      return res.status(403).json({ error: 'Cannot call blocked user' });
    }

    // Create call
    const call = await prisma.call.create({
      data: {
        callerId: req.user!.userId,
        calleeId: callee.id,
        status: 'ringing',
        callType
      },
      include: {
        caller: {
          select: {
            id: true,
            virtualNumber: true,
            displayName: true
          }
        },
        callee: {
          select: {
            id: true,
            virtualNumber: true,
            displayName: true
          }
        }
      }
    });

    // Create call participants
    await prisma.callParticipant.createMany({
      data: [
        {
          callId: call.id,
          userId: req.user!.userId,
          status: 'joined',
          joinedAt: new Date()
        },
        {
          callId: call.id,
          userId: callee.id,
          status: 'invited'
        }
      ]
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'call_started',
        metadata: { callId: call.id, calleeId: callee.id, callType }
      }
    });

    res.status(201).json(call);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Initiate call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initiate group call
router.post('/group', authenticate, async (req, res) => {
  try {
    const { groupId, callType } = groupCallSchema.parse(req.body);

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          where: { status: 'active' }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.members.some(m => m.userId === req.user!.userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Not a member of this group' });
    }

    // Create call
    const call = await prisma.call.create({
      data: {
        callerId: req.user!.userId,
        groupId,
        status: 'ringing',
        callType
      },
      include: {
        group: true
      }
    });

    // Create call participants for all members
    await prisma.callParticipant.createMany({
      data: group.members.map(member => ({
        callId: call.id,
        userId: member.userId,
        status: member.userId === req.user!.userId ? 'joined' : 'invited',
        joinedAt: member.userId === req.user!.userId ? new Date() : null
      }))
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'group_call_started',
        metadata: { callId: call.id, groupId, callType }
      }
    });

    res.status(201).json(call);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Initiate group call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Respond to call
router.post('/:id/respond', authenticate, async (req, res) => {
  try {
    const { accept } = respondCallSchema.parse(req.body);

    const participant = await prisma.callParticipant.findFirst({
      where: {
        callId: req.params.id,
        userId: req.user!.userId
      },
      include: {
        call: true
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Call participant not found' });
    }

    if (participant.status !== 'invited') {
      return res.status(400).json({ error: 'Already responded to this call' });
    }

    if (accept) {
      await prisma.callParticipant.update({
        where: { id: participant.id },
        data: {
          status: 'joined',
          joinedAt: new Date()
        }
      });

      // Update call status if this is a 1:1 call
      if (participant.call.calleeId) {
        await prisma.call.update({
          where: { id: req.params.id },
          data: { status: 'accepted' }
        });
      }
    } else {
      await prisma.callParticipant.update({
        where: { id: participant.id },
        data: { status: 'declined' }
      });

      // Update call status for 1:1 call
      if (participant.call.calleeId) {
        await prisma.call.update({
          where: { id: req.params.id },
          data: { status: 'rejected' }
        });
      }
    }

    res.json({ message: accept ? 'Call accepted' : 'Call declined' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Respond to call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End call
router.post('/:id/end', authenticate, async (req, res) => {
  try {
    const participant = await prisma.callParticipant.findFirst({
      where: {
        callId: req.params.id,
        userId: req.user!.userId
      }
    });

    if (!participant) {
      return res.status(404).json({ error: 'Call participant not found' });
    }

    if (participant.status !== 'joined') {
      return res.status(400).json({ error: 'Not in this call' });
    }

    await prisma.callParticipant.update({
      where: { id: participant.id },
      data: {
        status: 'declined',
        leftAt: new Date()
      }
    });

    // Check if this was the last participant
    const remainingParticipants = await prisma.callParticipant.count({
      where: {
        callId: req.params.id,
        status: 'joined'
      }
    });

    if (remainingParticipants === 0) {
      // End the call
      const call = await prisma.call.findUnique({
        where: { id: req.params.id }
      });

      if (call) {
        const duration = Math.floor((new Date().getTime() - call.startedAt.getTime()) / 1000);
        await prisma.call.update({
          where: { id: req.params.id },
          data: {
            status: 'ended',
            endedAt: new Date(),
            durationSeconds: duration
          }
        });
      }
    }

    res.json({ message: 'Call ended' });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get call history
router.get('/history', authenticate, async (req, res) => {
  try {
    const calls = await prisma.call.findMany({
      where: {
        OR: [
          { callerId: req.user!.userId },
          { calleeId: req.user!.userId }
        ]
      },
      include: {
        caller: {
          select: {
            id: true,
            virtualNumber: true,
            displayName: true
          }
        },
        callee: {
          select: {
            id: true,
            virtualNumber: true,
            displayName: true
          }
        },
        group: true
      },
      orderBy: { startedAt: 'desc' },
      take: 50
    });

    res.json(calls);
  } catch (error) {
    console.error('Get call history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
