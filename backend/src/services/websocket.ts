import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '../utils/jwt';
import prisma from '../utils/prisma';

interface Client {
  ws: WebSocket;
  userId: string;
  virtualNumber: string;
}

const clients = new Map<WebSocket, Client>();

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // Authentication on first message
        if (message.type === 'auth') {
          const payload = verifyToken(message.token);
          
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, virtualNumber: true, status: true }
          });

          if (!user || user.status !== 'active') {
            ws.close();
            return;
          }

          clients.set(ws, {
            ws,
            userId: user.id,
            virtualNumber: user.virtualNumber
          });

          ws.send(JSON.stringify({ type: 'auth_success' }));
          return;
        }

        // Check if authenticated
        const client = clients.get(ws);
        if (!client) {
          ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
          return;
        }

        // Handle different message types
        switch (message.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;

          case 'call_invite':
            await handleCallInvite(client, message);
            break;

          case 'call_accept':
            await handleCallAccept(client, message);
            break;

          case 'call_reject':
            await handleCallReject(client, message);
            break;

          case 'call_end':
            await handleCallEnd(client, message);
            break;

          case 'webrtc_offer':
          case 'webrtc_answer':
          case 'webrtc_ice':
            await handleWebRTCSignal(client, message);
            break;

          default:
            ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
        }
      } catch (error) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });
}

async function handleCallInvite(client: Client, message: any) {
  const { calleeVirtualNumber, callId, callType } = message;

  // Find callee's WebSocket connection
  const calleeClient = Array.from(clients.values()).find(
    c => c.virtualNumber === calleeVirtualNumber
  );

  if (calleeClient) {
    calleeClient.ws.send(JSON.stringify({
      type: 'call_incoming',
      callId,
      callerVirtualNumber: client.virtualNumber,
      callType
    }));
  }
}

async function handleCallAccept(client: Client, message: any) {
  const { callId } = message;

  // Notify caller that call was accepted
  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { callerId: true }
  });

  if (call) {
    const callerClient = Array.from(clients.values()).find(
      c => c.userId === call.callerId
    );

    if (callerClient) {
      callerClient.ws.send(JSON.stringify({
        type: 'call_accepted',
        callId
      }));
    }
  }
}

async function handleCallReject(client: Client, message: any) {
  const { callId } = message;

  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { callerId: true }
  });

  if (call) {
    const callerClient = Array.from(clients.values()).find(
      c => c.userId === call.callerId
    );

    if (callerClient) {
      callerClient.ws.send(JSON.stringify({
        type: 'call_rejected',
        callId
      }));
    }
  }
}

async function handleCallEnd(client: Client, message: any) {
  const { callId } = message;

  // Notify all participants
  const participants = await prisma.callParticipant.findMany({
    where: { callId, status: 'joined' },
    select: { userId: true }
  });

  for (const participant of participants) {
    const participantClient = Array.from(clients.values()).find(
      c => c.userId === participant.userId
    );

    if (participantClient && participantClient.userId !== client.userId) {
      participantClient.ws.send(JSON.stringify({
        type: 'call_ended',
        callId,
        endedBy: client.virtualNumber
      }));
    }
  }
}

async function handleWebRTCSignal(client: Client, message: any) {
  const { targetUserId, signal } = message;

  const targetClient = Array.from(clients.values()).find(
    c => c.userId === targetUserId
  );

  if (targetClient) {
    targetClient.ws.send(JSON.stringify({
      type: message.type,
      fromUserId: client.userId,
      signal
    }));
  }
}

export function broadcastToUser(userId: string, message: any) {
  const client = Array.from(clients.values()).find(c => c.userId === userId);
  if (client) {
    client.ws.send(JSON.stringify(message));
  }
}
