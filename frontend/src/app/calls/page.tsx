'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import api from '@/lib/api';
import { Phone, Video, PhoneCall, ArrowLeft, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import type { Call, Connection } from '@/types';

export default function CallsPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const [calls, setCalls] = useState<Call[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [showCallModal, setShowCallModal] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [callType, setCallType] = useState<'audio' | 'video'>('audio');
  const [loading, setLoading] = useState(true);

  const fetchCalls = async () => {
    try {
      const response = await api.get('/calls/history');
      setCalls(response.data);
    } catch (error) {
      console.error('Failed to fetch calls:', error);
    }
  };

  const fetchConnections = async () => {
    try {
      const response = await api.get('/connections');
      setConnections(response.data.filter((c: Connection) => c.status === 'active'));
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  const initiateCall = async () => {
    if (!selectedConnection) return;

    if (callType === 'audio') {
      window.dispatchEvent(new CustomEvent('start_audio_call', {
        detail: { virtualNumber: selectedConnection.user.virtualNumber }
      }));
      setShowCallModal(false);
      setSelectedConnection(null);
    } else {
      alert("Video calls are not implemented yet! Try Audio.");
    }
  };

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchCalls();
    fetchConnections();
  }, [user, router]);

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
              <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
            </div>
            <button
              onClick={() => setShowCallModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
            >
              <PhoneCall className="w-5 h-5" />
              <span>New Call</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Call History</h2>
          </div>

          {calls.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <PhoneCall className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No call history</p>
              <p className="text-sm mt-2">Start a call to see your history here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {calls.map((call) => (
                <div key={call.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        {call.callerId === user?.id ? (
                          <PhoneOutgoing className="w-6 h-6 text-green-600" />
                        ) : (
                          <PhoneIncoming className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {call.callerId === user?.id
                            ? `To: ${call.callee?.displayName || call.callee?.virtualNumber}`
                            : `From: ${call.caller?.displayName || call.caller?.virtualNumber}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {call.group?.name || '1:1 Call'} • {call.callType}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          call.status === 'ended'
                            ? 'bg-gray-100 text-gray-800'
                            : call.status === 'missed'
                            ? 'bg-red-100 text-red-800'
                            : call.status === 'accepted'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {call.status}
                      </span>
                      {call.durationSeconds && (
                        <span className="text-sm text-gray-500">
                          {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                        </span>
                      )}
                      <span className="text-sm text-gray-500">
                        {new Date(call.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">Start a Call</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Contact
                </label>
                <select
                  value={selectedConnection?.id || ''}
                  onChange={(e) => {
                    const conn = connections.find(c => c.id === e.target.value);
                    setSelectedConnection(conn || null);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                >
                  <option value="">Select a contact...</option>
                  {connections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.user.displayName || connection.user.virtualNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Call Type
                </label>
                <div className="flex gap-4">
                  <button
                    onClick={() => setCallType('audio')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition ${
                      callType === 'audio'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <Phone className="w-5 h-5" />
                    <span>Audio</span>
                  </button>
                  <button
                    onClick={() => setCallType('video')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg border-2 transition ${
                      callType === 'video'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    <Video className="w-5 h-5" />
                    <span>Video</span>
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={initiateCall}
                  disabled={!selectedConnection}
                  className="flex-1 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Call
                </button>
                <button
                  onClick={() => {
                    setShowCallModal(false);
                    setSelectedConnection(null);
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
    </div>
  );
}
