import { Prisma, PrismaClient } from '@prisma/client';
import prisma from '../utils/prisma';
import { generateNumberPool } from '../utils/numberGenerator';

type NumberPoolClient = PrismaClient | Prisma.TransactionClient;
type MongoCommandClient = {
  $runCommandRaw(command: Record<string, unknown>): Promise<unknown>;
};

export const initializeNumberPool = async (poolSize: number = 10000) => {
  const existingCount = await prisma.numberPool.count({
    where: { status: 'available' }
  });

  if (existingCount < poolSize / 2) {
    const numbers = generateNumberPool(poolSize - existingCount);
    
    await prisma.numberPool.createMany({
      data: numbers.map(number => ({
        number,
        status: 'available'
      }))
    });
  }
};

const reserveNumber = async (
  tx: NumberPoolClient,
  assignmentField: 'assigned_user_id' | 'assigned_group_id',
  ownerId: string,
): Promise<string> => {
  const result = await (tx as unknown as MongoCommandClient).$runCommandRaw({
    findAndModify: 'number_pool',
    query: { status: 'available' },
    sort: { _id: 1 },
    update: { $set: { status: 'assigned', [assignmentField]: ownerId } },
    new: true,
  }) as unknown as { value?: { _id?: string } };

  const number = result.value?._id;
  if (!number) {
    throw new Error('No available virtual numbers');
  }

  return number;
};

export const assignUserVirtualNumber = async (tx: NumberPoolClient, userId: string) => {
  return reserveNumber(tx, 'assigned_user_id', userId);
};

export const assignGroupVirtualNumber = async (tx: NumberPoolClient, groupId: string) => {
  return reserveNumber(tx, 'assigned_group_id', groupId);
};

export const releaseVirtualNumber = async (virtualNumber: string) => {
  const cooldownDays = 90;
  await (prisma as unknown as MongoCommandClient).$runCommandRaw({
    update: 'number_pool',
    updates: [{
      q: { _id: virtualNumber },
      u: {
        $set: { status: 'cooldown', released_at: new Date() },
        $unset: { assigned_user_id: '', assigned_group_id: '' },
      },
      multi: false,
    }],
  });
};

export const processCooldownNumbers = async () => {
  const cooldownEndsAt = new Date();
  cooldownEndsAt.setDate(cooldownEndsAt.getDate() - 90);
  
  const expiredCooldownNumbers = await prisma.numberPool.findMany({
    where: {
      status: 'cooldown',
      releasedAt: { lte: cooldownEndsAt }
    }
  });

  for (const numberPool of expiredCooldownNumbers) {
    await prisma.numberPool.update({
      where: { number: numberPool.number },
      data: { status: 'available' }
    });
  }
};
