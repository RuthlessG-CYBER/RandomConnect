import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import prisma from '../utils/prisma';
import { authenticate } from '../middleware/auth';
import { assignGroupVirtualNumber, initializeNumberPool } from '../services/numberService';

const router = Router();

const createGroupSchema = z.object({
  name: z.string().min(2).max(100)
});

const inviteUserSchema = z.object({
  virtualNumber: z.string().regex(/^\d{3}-\d{3}-\d{4}$/)
});

const respondInviteSchema = z.object({
  accept: z.boolean()
});

// Create a group
router.post('/', authenticate, async (req, res) => {
  try {
    const { name } = createGroupSchema.parse(req.body);

    // Initialize number pool if needed
    await initializeNumberPool();

    const groupId = uuid();
    const updatedGroup = await prisma.$transaction(async (tx) => {
      await tx.group.create({
        data: {
          id: groupId,
          name,
          ownerId: req.user!.userId,
          groupNumber: `pending-${groupId}`,
        },
      });
      const groupNumber = await assignGroupVirtualNumber(tx, groupId);
      const group = await tx.group.update({
        where: { id: groupId },
        data: { groupNumber },
      });

      await tx.groupMember.create({
        data: {
          groupId,
          userId: req.user!.userId,
          role: 'owner',
          status: 'active',
        },
      });

      return group;
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'group_created',
        metadata: { groupId: updatedGroup.id, groupName: name, groupNumber: updatedGroup.groupNumber }
      }
    });

    res.status(201).json(updatedGroup);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Create group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's groups
router.get('/', authenticate, async (req, res) => {
  try {
    const memberships = await prisma.groupMember.findMany({
      where: {
        userId: req.user!.userId,
        status: 'active'
      },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    virtualNumber: true,
                    displayName: true
                  }
                }
              }
            }
          }
        }
      }
    });

    res.json(memberships.map(m => m.group));
  } catch (error) {
    console.error('Get groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific group
router.get('/:id', authenticate, async (req, res) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                virtualNumber: true,
                displayName: true,
                profilePhotoUrl: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is a member
    const isMember = group.members.some(m => m.userId === req.user!.userId);
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(group);
  } catch (error) {
    console.error('Get group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invite user to group
router.post('/:id/invite', authenticate, async (req, res) => {
  try {
    const { virtualNumber } = inviteUserSchema.parse(req.body);

    const group = await prisma.group.findUnique({
      where: { id: req.params.id }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if user is owner or admin
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: req.params.id,
        userId: req.user!.userId,
        status: 'active'
      }
    });

    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ error: 'Only owners and admins can invite' });
    }

    // Find user to invite
    const invitee = await prisma.user.findUnique({
      where: { virtualNumber }
    });

    if (!invitee) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a member
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        groupId: req.params.id,
        userId: invitee.id
      }
    });

    if (existingMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Check for existing pending invite
    const existingInvite = await prisma.groupInvite.findFirst({
      where: {
        groupId: req.params.id,
        invitedUserId: invitee.id,
        status: 'pending'
      }
    });

    if (existingInvite) {
      return res.status(400).json({ error: 'User already has a pending invite' });
    }

    // Create invite
    const invite = await prisma.groupInvite.create({
      data: {
        groupId: req.params.id,
        invitedUserId: invitee.id,
        invitedBy: req.user!.userId,
        status: 'pending'
      },
      include: {
        group: true,
        invitedUser: {
          select: {
            id: true,
            virtualNumber: true,
            displayName: true
          }
        }
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user!.userId,
        action: 'invite_sent',
        metadata: { groupId: req.params.id, invitedUserId: invitee.id }
      }
    });

    res.status(201).json(invite);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's group invites
router.get('/invites/me', authenticate, async (req, res) => {
  try {
    const invites = await prisma.groupInvite.findMany({
      where: {
        invitedUserId: req.user!.userId,
        status: 'pending'
      },
      include: {
        group: true,
        invitedByUser: {
          select: {
            id: true,
            virtualNumber: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(invites);
  } catch (error) {
    console.error('Get invites error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Respond to group invite
router.post('/invites/:id/respond', authenticate, async (req, res) => {
  try {
    const { accept } = respondInviteSchema.parse(req.body);

    const invite = await prisma.groupInvite.findUnique({
      where: { id: req.params.id }
    });

    if (!invite) {
      return res.status(404).json({ error: 'Invite not found' });
    }

    if (invite.invitedUserId !== req.user!.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ error: 'Invite already responded' });
    }

    if (accept) {
      // Add user to group
      await prisma.groupMember.create({
        data: {
          groupId: invite.groupId,
          userId: req.user!.userId,
          role: 'member',
          status: 'active'
        }
      });

      await prisma.groupInvite.update({
        where: { id: req.params.id },
        data: { status: 'accepted', respondedAt: new Date() }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user!.userId,
          action: 'invite_accepted',
          metadata: { groupId: invite.groupId }
        }
      });
    } else {
      await prisma.groupInvite.update({
        where: { id: req.params.id },
        data: { status: 'declined', respondedAt: new Date() }
      });
    }

    res.json({ message: accept ? 'Invite accepted' : 'Invite declined' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error('Respond to invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Leave group
router.post('/:id/leave', authenticate, async (req, res) => {
  try {
    const membership = await prisma.groupMember.findFirst({
      where: {
        groupId: req.params.id,
        userId: req.user!.userId,
        status: 'active'
      }
    });

    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this group' });
    }

    if (membership.role === 'owner') {
      return res.status(400).json({ error: 'Owner cannot leave group. Transfer ownership first.' });
    }

    await prisma.groupMember.update({
      where: { id: membership.id },
      data: { status: 'left' }
    });

    res.json({ message: 'Left group successfully' });
  } catch (error) {
    console.error('Leave group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
