'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Users, ArrowLeft, UserPlus, Ban, UserMinus } from 'lucide-react';
import type { Connection } from '@/types';

export default function ConnectionsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConnections = async () => {
    try {
      const response = await api.get('/connections');
      setConnections(response.data);
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateConnectionStatus = async (connectionId: string, status: 'blocked' | 'removed') => {
    try {
      await api.patch(`/connections/${connectionId}`, { status });
      await fetchConnections();
    } catch (error) {
      console.error('Failed to update connection:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchConnections();
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
              <h1 className="text-2xl font-bold text-gray-900">Connections</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              All Connections ({connections.length})
            </h2>
          </div>

          {connections.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No connections yet</p>
              <p className="text-sm mt-2">
                Share your virtual number to start connecting with others
              </p>
              <button
                onClick={() => router.push('/messages')}
                className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition"
              >
                Start a Conversation
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {connections.map((connection) => (
                <div key={connection.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="font-medium text-gray-600">
                          {connection.user.displayName?.[0] || connection.user.virtualNumber[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {connection.user.displayName || connection.user.virtualNumber}
                        </p>
                        <p className="text-sm text-gray-500">{connection.user.virtualNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          connection.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : connection.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : connection.status === 'blocked'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {connection.status}
                      </span>

                      {connection.status === 'active' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => router.push('/messages')}
                            className="text-indigo-600 hover:text-indigo-700 p-2 hover:bg-indigo-50 rounded-lg transition"
                            title="Message"
                          >
                            <UserPlus className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => updateConnectionStatus(connection.id, 'blocked')}
                            className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition"
                            title="Block"
                          >
                            <Ban className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => updateConnectionStatus(connection.id, 'removed')}
                            className="text-gray-600 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Remove"
                          >
                            <UserMinus className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {connection.status === 'pending' && (
                    <div className="mt-3 ml-16">
                      <p className="text-sm text-gray-500">
                        This connection is pending. Reply to their message to activate it.
                      </p>
                      <button
                        onClick={() => router.push('/messages')}
                        className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                      >
                        Go to Messages →
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
