"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import {
  Phone,
  Video,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Bell,
  CheckCircle2,
  XCircle,
  X,
  Search,
  Filter,
  ShieldAlert
} from "lucide-react";
import type { Call, Connection } from "@/types";

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
    window.dispatchEvent(new CustomEvent('start_call', {
      detail: { 
        virtualNumber: selectedConnection.user.virtualNumber,
        type: callType
      }
    }));
    setShowCallModal(false);
    setSelectedConnection(null);
  };

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchCalls();
    fetchConnections();
  }, [_hasHydrated, user, router]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f8f9fd]">
        <div className="size-9 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
      </div>
    );
  }

  const missedCallsCount = calls.filter((c) => c.status === 'missed' && c.calleeId === user?.id).length;

  return (
    <main className="flex-1 bg-[#f8f9fd] text-slate-900 font-sans flex flex-col relative overflow-x-hidden">

      {/* Subtle Ambient Glow Orbs */}
      <div className="absolute -top-24 right-10 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none z-0"></div>
      <div className="absolute top-72 -left-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none z-0"></div>

      <div className="relative w-full px-5 sm:px-8 lg:px-12 py-8 flex flex-col gap-8 z-10 flex-1">
        
        {/* SECTION: Header & Actions */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col gap-2">

            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Encrypted Calls</h1>
            <p className="text-[15px] text-slate-500 max-w-2xl mt-1 leading-relaxed">
              Your voice and video history. All media streams are end-to-end encrypted and routed purely peer-to-peer using ephemeral DTLS-SRTP keys.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button 
              onClick={() => setShowCallModal(true)}
              className="px-5 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition flex items-center gap-2 active:scale-95"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Start Secure Call</span>
            </button>
          </div>
        </div>

        {/* SECTION: Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-100  p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12  bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <PhoneOutgoing className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Calls</p>
              <p className="text-2xl font-bold text-slate-900">{calls.length}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-100  p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12  bg-red-50 text-red-600 flex items-center justify-center">
              <PhoneMissed className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Missed Calls</p>
              <p className="text-2xl font-bold text-slate-900">{missedCallsCount}</p>
            </div>
          </div>
          <div className="bg-white border border-slate-100  p-5 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12  bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Secure Protocol</p>
              <p className="text-sm font-bold text-slate-900 mt-1">DTLS 1.2 / SRTP</p>
            </div>
          </div>
        </div>

        {/* SECTION: Call History List */}
        <div className="bg-white  shadow-sm border border-slate-100 overflow-hidden flex flex-col mb-8">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Recent History</h2>
            <div className="flex items-center gap-3">
              <button className="text-slate-400 hover:text-slate-600 transition">
                <Search className="w-4 h-4" />
              </button>
              <button className="text-slate-400 hover:text-slate-600 transition">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {calls.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                <PhoneCall className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No recent calls</h3>
              <p className="text-[15px] text-slate-500 max-w-sm mt-1">
                Your call history is empty. Start a secure end-to-end encrypted audio or video call.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {calls.map((call) => {
                const isOutgoing = call.callerId === user?.id;
                const peerName = isOutgoing 
                  ? (call.callee?.displayName || call.callee?.virtualNumber)
                  : (call.caller?.displayName || call.caller?.virtualNumber);
                const isMissed = call.status === 'missed';
                
                return (
                  <div key={call.id} className="p-4 sm:p-5 hover:bg-slate-50 transition group flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center shadow-sm border ${
                        isMissed ? 'bg-red-50 border-red-100 text-red-600' :
                        isOutgoing ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 
                        'bg-emerald-50 border-emerald-100 text-emerald-600'
                      }`}>
                        {isMissed ? <PhoneMissed className="w-5 h-5" /> : isOutgoing ? <PhoneOutgoing className="w-5 h-5" /> : <PhoneIncoming className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className={`font-bold text-base ${isMissed && !isOutgoing ? 'text-red-600' : 'text-slate-900'}`}>
                          {peerName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            {call.callType === 'video' ? <Video className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
                            {call.callType}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs text-slate-500 font-medium">
                            {new Date(call.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 self-end sm:self-auto pl-16 sm:pl-0">
                      <div className="flex flex-col items-end">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                            call.status === 'ended' ? 'bg-slate-100 text-slate-600' : 
                            call.status === 'missed' ? 'bg-red-50 text-red-600' : 
                            call.status === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 
                            'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {call.status}
                        </span>
                        <span className="text-xs font-mono font-medium text-slate-400 mt-1">
                          {call.durationSeconds ? `${Math.floor(call.durationSeconds / 60)}m ${call.durationSeconds % 60}s` : '0m 0s'}
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          const conn = connections.find(c => (c.user.id === call.callerId || c.user.id === call.calleeId) && c.user.id !== user?.id);
                          if (conn) {
                            setSelectedConnection(conn);
                            setCallType(call.callType);
                            setShowCallModal(true);
                          }
                        }}
                        className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-indigo-600 hover:text-white hover:shadow-md transition opacity-0 group-hover:opacity-100"
                        title="Call back"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Start Call Modal */}
      {showCallModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white  w-full max-w-md shadow-xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Start Secure Call</h2>
              <button onClick={() => setShowCallModal(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Peer Node
                </label>
                <select
                  value={selectedConnection?.id || ''}
                  onChange={(e) => {
                    const conn = connections.find(c => c.id === e.target.value);
                    setSelectedConnection(conn || null);
                  }}
                  className="w-full px-4 py-3 border border-slate-200  bg-slate-50 text-slate-900 font-medium focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 outline-none transition shadow-sm"
                >
                  <option value="">Select a verified contact...</option>
                  {connections.map((connection) => (
                    <option key={connection.id} value={connection.id}>
                      {connection.user.displayName || connection.user.virtualNumber}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Encryption Mode
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setCallType('audio')}
                    className={`flex-1 flex flex-col items-center justify-center gap-2 py-4  border-2 transition ${
                      callType === 'audio'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm'
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Phone className={`w-6 h-6 ${callType === 'audio' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="font-semibold text-sm">Voice Only</span>
                  </button>
                  <button
                    onClick={() => setCallType('video')}
                    className={`flex-1 flex flex-col items-center justify-center gap-2 py-4  border-2 transition ${
                      callType === 'video'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-sm'
                        : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Video className={`w-6 h-6 ${callType === 'video' ? 'text-indigo-600' : 'text-slate-400'}`} />
                    <span className="font-semibold text-sm">Video Stream</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex gap-3">
              <button
                onClick={() => {
                  setShowCallModal(false);
                  setSelectedConnection(null);
                }}
                className="flex-1 px-5 py-2.5  bg-white border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={initiateCall}
                disabled={!selectedConnection}
                className="flex-1 px-5 py-2.5  bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                Initialize Call
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
