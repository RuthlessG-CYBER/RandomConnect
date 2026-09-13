export interface User {
  id: string;
  virtualNumber: string;
  displayName: string | null;
  profilePhotoUrl: string | null;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: string;
}

export interface AuthResponse {
  user: {
    id: string;
    virtualNumber: string;
    displayName: string | null;
  };
  accessToken: string;
  refreshToken: string;
}

export interface Connection {
  id: string;
  status: 'pending' | 'active' | 'blocked' | 'removed';
  requestedBy: string;
  user: {
    id: string;
    virtualNumber: string;
    displayName: string | null;
    profilePhotoUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  connectionId: string;
  senderId: string;
  body: string;
  sentAt: string;
  deliveredAt: string | null;
  readAt: string | null;
  sender: {
    id: string;
    virtualNumber: string;
    displayName: string | null;
  };
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  groupNumber: string;
  createdAt: string;
  members: GroupMember[];
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  status: 'active' | 'left' | 'removed';
  user: {
    id: string;
    virtualNumber: string;
    displayName: string | null;
    profilePhotoUrl: string | null;
  };
}

export interface GroupInvite {
  id: string;
  groupId: string;
  invitedUserId: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
  createdAt: string;
  respondedAt: string | null;
  group: Group;
  invitedUser: {
    id: string;
    virtualNumber: string;
    displayName: string | null;
  };
  invitedByUser: {
    id: string;
    virtualNumber: string;
    displayName: string | null;
  };
}

export interface Call {
  id: string;
  callerId: string;
  calleeId: string | null;
  groupId: string | null;
  status: 'ringing' | 'accepted' | 'rejected' | 'missed' | 'ended' | 'failed';
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  callType: 'audio' | 'video';
  caller?: {
    id: string;
    virtualNumber: string;
    displayName: string | null;
  };
  callee?: {
    id: string;
    virtualNumber: string;
    displayName: string | null;
  };
  group?: Group;
}
