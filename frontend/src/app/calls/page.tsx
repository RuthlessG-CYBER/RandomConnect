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
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
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

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent Calls</h2>
              <p className="text-sm text-slate-500">Your secure voice and video history.</p>
            </div>
            <div className="hidden sm:block">
              <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-100">
                End-to-End Encrypted
              </span>
            </div>
          </div>

          {calls.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <PhoneCall className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-lg font-semibold text-slate-900">No calls yet</p>
              <p className="text-sm mt-1">Start a secure call to see your history here</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {calls.map((call) => (
                <div key={call.id} className="p-4 sm:p-5 hover:bg-slate-50 transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm border ${call.callerId === user?.id ? 'bg-emerald-50 border-emerald-100' : 'bg-indigo-50 border-indigo-100'}`}>
                      {call.callerId === user?.id ? (
                        <PhoneOutgoing className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <PhoneIncoming className="w-5 h-5 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-base">
                        {call.callerId === user?.id
                          ? call.callee?.displayName || call.callee?.virtualNumber
                          : call.caller?.displayName || call.caller?.virtualNumber}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-medium text-slate-500 capitalize px-2 py-0.5 bg-slate-100 rounded-md">
                          {call.callType} call
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(call.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto pl-16 sm:pl-0">
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-bold tracking-wide ${
                        call.status === 'ended'
                          ? 'bg-slate-100 text-slate-600'
                          : call.status === 'missed'
                          ? 'bg-red-50 text-red-600 border border-red-100'
                          : call.status === 'accepted'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}
                    >
                      {call.status.toUpperCase()}
                    </span>
                    {call.durationSeconds ? (
                      <span className="text-sm font-medium text-slate-500 w-16 text-right">
                        {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-slate-400 w-16 text-right">-</span>
                    )}
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition opacity-0 group-hover:opacity-100">
                      <Phone className="w-4 h-4" />
                    </button>
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
