'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Users, ArrowLeft, Plus, UserPlus, LogOut } from 'lucide-react';
import type { Group, GroupInvite } from '@/types';

export default function GroupsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const [groups, setGroups] = useState<Group[]>([]);
  const [invites, setInvites] = useState<GroupInvite[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupToInvite, setGroupToInvite] = useState<Group | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteNumber, setInviteNumber] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviting, setInviting] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    try {
      const response = await api.get('/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await api.get('/groups/invites/me');
      setInvites(response.data);
    } catch (error) {
      console.error('Failed to fetch invites:', error);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) return;

    try {
      await api.post('/groups', { name: newGroupName });
      setShowCreateModal(false);
      setNewGroupName('');
      await fetchGroups();
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const respondToInvite = async (inviteId: string, accept: boolean) => {
    try {
      await api.post(`/groups/invites/${inviteId}/respond`, { accept });
      await fetchInvites();
      await fetchGroups();
    } catch (error) {
      console.error('Failed to respond to invite:', error);
    }
  };

  const leaveGroup = async (groupId: string) => {
    try {
      await api.post(`/groups/${groupId}/leave`);
      await fetchGroups();
    } catch (error) {
      console.error('Failed to leave group:', error);
    }
  };

  const inviteToGroup = async () => {
    if (!groupToInvite || !inviteNumber.trim()) return;

    setInviting(true);
    setInviteError('');
    try {
      await api.post(`/groups/${groupToInvite.id}/invite`, { virtualNumber: inviteNumber.trim() });
      setGroupToInvite(null);
      setInviteNumber('');
    } catch (error: unknown) {
      if (typeof error === 'object' && error && 'response' in error) {
        const response = error.response as { data?: { error?: string } };
        setInviteError(response.data?.error || 'Could not send the invite.');
      } else {
        setInviteError('Could not send the invite.');
      }
    } finally {
      setInviting(false);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchGroups();
    fetchInvites();
  }, [_hasHydrated, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => router.push('/dashboard')} className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              <Plus className="w-5 h-5" />
              <span>Create Group</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Pending Invites */}
        {invites.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
            <h3 className="font-medium text-yellow-800 mb-3">Pending Group Invites</h3>
            {invites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between py-2 border-b border-yellow-200 last:border-0">
                <div>
                  <p className="font-medium text-yellow-900">{invite.group.name}</p>
                  <p className="text-sm text-yellow-700">
                    Invited by {invite.invitedByUser.displayName || invite.invitedByUser.virtualNumber}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToInvite(invite.id, true)}
                    className="bg-green-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-green-600 transition"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondToInvite(invite.id, false)}
                    className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600 transition"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Groups Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No groups yet</p>
              <p className="text-sm mt-2">Create a group to start collaborating with others</p>
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">{group.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{group.groupNumber}</p>
                    </div>
                    {group.ownerId === user?.id && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                        Owner
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600">{group.members.length} members</span>
                  </div>

                  <div className="flex -space-x-2 mb-4">
                    {group.members.slice(0, 4).map((member) => (
                      <div
                        key={member.id}
                        className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center border-2 border-white"
                        title={member.user.displayName || member.user.virtualNumber}
                      >
                        <span className="text-xs font-medium text-gray-600">
                          {member.user.displayName?.[0] || member.user.virtualNumber[0]}
                        </span>
                      </div>
                    ))}
                    {group.members.length > 4 && (
                      <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center border-2 border-white">
                        <span className="text-xs font-medium text-gray-600">
                          +{group.members.length - 4}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {group.ownerId === user?.id && (
                      <button
                        onClick={() => {
                          setGroupToInvite(group);
                          setInviteError('');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 transition text-sm"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>Invite</span>
                      </button>
                    )}
                    <button
                      onClick={() => leaveGroup(group.id)}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition text-sm"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Leave</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">Create New Group</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="Enter group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createGroup}
                  disabled={!newGroupName.trim()}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Group
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewGroupName('');
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {groupToInvite && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold">Invite to {groupToInvite.name}</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              Members join only after accepting the invite.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="invite-number">
              Virtual Number
            </label>
            <input
              id="invite-number"
              type="text"
              inputMode="numeric"
              placeholder="123-456-7890"
              value={inviteNumber}
              onChange={(event) => setInviteNumber(event.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            {inviteError && <p className="text-sm text-red-600 mt-2">{inviteError}</p>}
            <div className="flex gap-2 mt-4">
              <button
                onClick={inviteToGroup}
                disabled={inviting || !inviteNumber.trim()}
                className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviting ? 'Sending…' : 'Send Invite'}
              </button>
              <button
                onClick={() => {
                  setGroupToInvite(null);
                  setInviteNumber('');
                  setInviteError('');
                }}
                disabled={inviting}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
